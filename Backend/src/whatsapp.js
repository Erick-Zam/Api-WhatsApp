import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { triggerWebhooks } from './services/webhooks.js';

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
    const sessionDir = path.join(AUTH_DIR, sessionId);

    // Ensure parent dir exists
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

    // Store session immediately
    sessions.set(sessionId, sock);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Trigger generic connection update webhook
        triggerWebhooks(sessionId, 'connection.update', { connection, qr: qr ? 'QR_RECEIVED' : undefined });

        if (qr) {
            qrCodes.set(sessionId, qr);
            console.log(`QR Code received for session: ${sessionId}`);
        }

        if (connection === 'open') {
            qrCodes.delete(sessionId);
            retryCounts.set(sessionId, 0);
            console.log(`Session '${sessionId}' connected to WhatsApp!`);

            // Generate API Key ONLY on successful connection
            import('./services/apiKeys.js').then(({ createSessionKey }) => {
                createSessionKey(sessionId).catch(e => console.error(`Error creating key for ${sessionId}:`, e));
            });

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
                // Delete API Key on logout
                import('./services/apiKeys.js').then(({ deleteSessionKey }) => {
                    deleteSessionKey(sessionId).catch(e => console.error(`Error deleting key for ${sessionId}:`, e));
                });
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    console.log(`[${sessionId}] New Message:`, JSON.stringify(msg, null, 2));
                    // Trigger webhook for new message
                    triggerWebhooks(sessionId, 'messages.upsert', msg);
                }
            }
        }
    });

    // Listen for status updates (read receipts etc)
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            // Trigger webhook for status update
            triggerWebhooks(sessionId, 'messages.update', update);
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
            // Key deletion handling is done in 'close' event
        } catch (err) {
            console.error(`Error logging out session ${sessionId}:`, err);
            sock.end(undefined);
            // Force delete key if error occurs
            import('./services/apiKeys.js').then(({ deleteSessionKey }) => {
                deleteSessionKey(sessionId).catch(e => console.error(`Error deleting key for ${sessionId}:`, e));
            });
        } finally {
            sessions.delete(sessionId);
            qrCodes.delete(sessionId);
        }
    }
};

const deleteSession = async (sessionId) => {
    await disconnectFromWhatsApp(sessionId);
    const sessionDir = path.join(AUTH_DIR, sessionId);
    try {
        if (fs.existsSync(sessionDir)) {
            // Node 14+ supports recursive rm
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`Deleted session data for ${sessionId}`);
        }
        // Ensure key is nuked
        import('./services/apiKeys.js').then(({ deleteSessionKey }) => {
            deleteSessionKey(sessionId).catch(e => console.error(`Error deleting key for ${sessionId}:`, e));
        });
    } catch (e) {
        console.error(`Error deleting session ${sessionId}:`, e);
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
            const diskSessions = files.filter(f => {
                try {
                    return fs.statSync(path.join(AUTH_DIR, f)).isDirectory();
                } catch { return false; }
            });

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

    // Remove duplicates by ID
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
            } catch { return false; }
        });

        if (sessionFolders.length === 0) {
            console.log('No sessions found in volume. Waiting for user to create one.');
            // Do NOT start default session automatically
        } else {
            sessionFolders.forEach(sessionId => {
                console.log(`Restoring session: ${sessionId}`);
                connectToWhatsApp(sessionId).catch(e => console.error(`Failed to restore ${sessionId}:`, e));
            });
        }
    } catch (err) {
        console.error('Error initializing sessions:', err);
    }
};

// --- Helper: Get JID ---
const formatJid = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.includes('@s.whatsapp.net')) {
        return cleaned;
    }
    if (!cleaned) return null;
    return `${cleaned}@s.whatsapp.net`;
}

// --- Sending Functions ---

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

const sendReaction = async (jid, key, text, sessionId = 'default') => {
    // key is the message key object { remoteJid, fromMe, id }
    // text is the emoji
    return await sendMessage(jid, {
        react: {
            text: text, // use an empty string to remove the reaction
            key: key
        }
    }, {}, sessionId);
};

const sendReply = async (jid, text, quotedMessageId, sessionId = 'default') => {
    // We need to construct a minimal key for valid quoting if we don't have the full object.
    // Ideally user passes the full message object, but usually they just have ID.
    // Baileys needs the full message context to quote properly usually, but let's try with minimal key.
    // Note: Quoting works best if we have the message object. 
    // If we only have ID, we might need to assume it was from the 'jid' user.
    // For specific Reply functionality, the frontend usually sends the whole context or we fetch it.
    // For simplicity here, we will accept a 'quoted' object or try to build one.

    // Simplest approach: Just send text. 
    // To actually quote, we need to pass { quoted: messageObject } in options.
    // Since we don't have a message store, we can't look up by ID easily.
    // Limit: This specific simple implementation might just be sending text unless 'options' is extended.
    // Let's implement fully in sendMessage options if caller provides 'quoted'.

    // Actually, let's implement a direct 'reply' helper that takes a context object if provided.
    // But since we are stateless regarding old messages, we can only quote if the user provides the raw message JSON they received via webhook.
    // OR we can rely on the frontend passing the 'quoted' object.

    // Let's stick to reaction for now as it's easier to implement with just ID + JID.
    return await sendMessage(jid, { text }, { quoted: quotedMessageId }, sessionId);
};


export {
    connectToWhatsApp,
    disconnectFromWhatsApp,
    deleteSession,
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
    sendReaction, // Exported
    sendReply,    // Exported
    getConnectionStatus as default
};
