import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Session storage
const sessions = new Map(); // sessionId -> socket
const qrCodes = new Map(); // sessionId -> qrCode
const retryCounts = new Map(); // sessionId -> retryCount
const MAX_RETRIES = 5;
const AUTH_DIR = 'auth_info_baileys';

// Helper to get session ID from request or default
const getSession = (sessionId = 'default') => sessions.get(sessionId);

/**
 * Connect to WhatsApp with a specific session ID
 */
async function connectToWhatsApp(sessionId = 'default') {
    // Store in subfolder of the mounted volume for persistence
    // Use path.join for cross-platform compatibility, though Docker is usually Linux
    const sessionDir = path.join(AUTH_DIR, sessionId);

    // Ensure parent dir exists (if not created by docker volume?)
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: sessionId === 'default', // Only print default QR to terminal
        logger: pino({ level: 'silent' }),
        browser: [`WhatsApp API (${sessionId})`, 'Chrome', '1.0.0'],
        syncFullHistory: false,
    });

    // Store session immediately so event handlers can reference it
    sessions.set(sessionId, sock);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodes.set(sessionId, qr);
            console.log(`QR Code received for session: ${sessionId}`);
        }

        if (connection === 'open') {
            qrCodes.delete(sessionId);
            retryCounts.set(sessionId, 0);
            console.log(`Session '${sessionId}' connected to WhatsApp!`);
        } else if (connection === 'close') {
            qrCodes.delete(sessionId);
            sessions.delete(sessionId); // Remove closed session

            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`Session '${sessionId}' closed. Reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                const currentRetry = retryCounts.get(sessionId) || 0;
                if (currentRetry < MAX_RETRIES) {
                    retryCounts.set(sessionId, currentRetry + 1);
                    setTimeout(() => connectToWhatsApp(sessionId), (currentRetry + 1) * 1000);
                } else {
                    console.error(`Max retries reached for session ${sessionId}.`);
                }
            } else {
                console.log(`Session '${sessionId}' logged out.`);
                // Clean up creds if needed?
                // fs.rmSync(sessionDir, { recursive: true, force: true });
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    console.log(`[${sessionId}] New Message:`, JSON.stringify(msg, null, 2));
                }
            }
        }
    });

    return sock;
}

// --- Session Management ---

const disconnectFromWhatsApp = async (sessionId = 'default') => {
    const sock = sessions.get(sessionId);
    if (sock) {
        try {
            await sock.logout();
        } catch (err) {
            console.error(`Error logging out session ${sessionId}:`, err);
            sock.end(undefined);
        } finally {
            sessions.delete(sessionId);
            qrCodes.delete(sessionId);
        }
    }
};

const getQRCode = (sessionId = 'default') => qrCodes.get(sessionId);

const getConnectionStatus = (sessionId = 'default') => {
    const sock = sessions.get(sessionId);
    return (sock && sock.user) ? 'CONNECTED' : 'DISCONNECTED';
};

const getConnectedUser = (sessionId = 'default') => {
    const sock = sessions.get(sessionId);
    return sock ? sock.user : null;
};

const listSessions = () => {
    // List active sessions
    const active = Array.from(sessions.keys()).map(id => ({
        id,
        status: getConnectionStatus(id),
        user: getConnectedUser(id)
    }));

    // Also merge with known sessions from disk
    try {
        if (fs.existsSync(AUTH_DIR)) {
            const files = fs.readdirSync(AUTH_DIR);
            const diskSessions = files.filter(f => fs.statSync(path.join(AUTH_DIR, f)).isDirectory());

            diskSessions.forEach(id => {
                if (!sessions.has(id)) {
                    active.push({
                        id,
                        status: 'DISCONNECTED', // Known but not connected
                        user: null
                    });
                }
            });
        }
    } catch (e) {
        console.error('Error listing disk sessions:', e);
    }

    // Remove duplicates by ID (if map and push logic overlaps)
    const unique = new Map();
    active.forEach(s => unique.set(s.id, s));
    return Array.from(unique.values());
};

const initSessions = async () => {
    try {
        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
        }

        const files = fs.readdirSync(AUTH_DIR);
        const sessionFolders = files.filter(f => {
            try {
                return fs.statSync(path.join(AUTH_DIR, f)).isDirectory();
            } catch (e) { return false; }
        });

        if (sessionFolders.length === 0) {
            console.log('No sessions found in volume. Starting default session.');
            connectToWhatsApp('default');
        } else {
            sessionFolders.forEach(sessionId => {
                console.log(`Restoring session: ${sessionId}`);
                // Don't wait for one to finish before starting next
                connectToWhatsApp(sessionId).catch(e => console.error(`Failed to restore ${sessionId}:`, e));
            });
        }
    } catch (err) {
        console.error('Error initializing sessions:', err);
        connectToWhatsApp('default');
    }
};

// --- Helper: Get JID ---
const formatJid = (phone) => {
    if (!phone) return null;
    return phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
}

// --- Sending Functions (Updated with sessionId) ---

const sendMessage = async (jid, content, options = {}, sessionId = 'default') => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.sendMessage(jid, content, options);
};

const sendText = async (jid, text, sessionId = 'default') => {
    return await sendMessage(jid, { text }, {}, sessionId);
};

const sendImage = async (jid, imageUrl, caption = '', sessionId = 'default') => {
    return await sendMessage(jid, { image: { url: imageUrl }, caption }, {}, sessionId);
};

const sendVideo = async (jid, videoUrl, caption = '', gifPlayback = false, sessionId = 'default') => {
    return await sendMessage(jid, { video: { url: videoUrl }, caption, gifPlayback }, {}, sessionId);
};

const sendAudio = async (jid, audioUrl, ptt = false, sessionId = 'default') => {
    return await sendMessage(jid, { audio: { url: audioUrl }, ptt, mimetype: 'audio/mp4' }, {}, sessionId);
};

const sendDocument = async (jid, docUrl, fileName, mimetype, sessionId = 'default') => {
    return await sendMessage(jid, { document: { url: docUrl }, fileName, mimetype }, {}, sessionId);
};

const sendLocation = async (jid, lat, long, sessionId = 'default') => {
    return await sendMessage(jid, { location: { degreesLatitude: lat, degreesLongitude: long } }, {}, sessionId);
};

const sendContact = async (jid, name, phone, sessionId = 'default') => {
    const vcard = 'BEGIN:VCARD\n'
        + 'VERSION:3.0\n'
        + `FN:${name}\n`
        + `TEL;type=CELL;type=VOICE;waid=${phone}:${phone}\n`
        + 'END:VCARD';

    return await sendMessage(jid, {
        contacts: {
            displayName: name,
            contacts: [{ vcard }]
        }
    }, {}, sessionId);
};

const sendPoll = async (jid, name, values, singleSelect = false, sessionId = 'default') => {
    return await sendMessage(jid, {
        poll: {
            name: name,
            values: values,
            selectableCount: singleSelect ? 1 : values.length
        }
    }, {}, sessionId);
};

const updatePresence = async (jid, type, sessionId = 'default') => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.sendPresenceUpdate(type, jid);
};

export {
    connectToWhatsApp,
    disconnectFromWhatsApp,
    initSessions,
    getQRCode,
    getConnectionStatus,
    getConnectedUser,
    listSessions,
    formatJid,
    sendMessage,
    sendText,
    sendImage,
    sendVideo,
    sendAudio,
    sendDocument,
    sendLocation,
    sendContact,
    sendPoll,
    updatePresence,
    getConnectionStatus as default // careful with default exports
};
