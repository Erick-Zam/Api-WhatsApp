import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';

// Global state variables
let qrCode = null;
let sock = null;
let retryCount = 0;
const MAX_RETRIES = 5; // Prevent infinite restart loops

/**
 * Main connection function.
 * In production, replace `useMultiFileAuthState` with a database adapter.
 * Example: `usePostgresAuthState(db)`
 */
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }), // Set to 'info' for debugging
        browser: ['WhatsApp API', 'Chrome', '1.0.0'], // Custom browser name
        syncFullHistory: false, // Set to true if you need full chat history (slower startup)
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCode = qr;
            console.log('QR Code received');
        }

        if (connection === 'open') {
            qrCode = null;
            retryCount = 0; // Reset retries on successful connection
            console.log('Opened connection to WhatsApp!');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);

            if (shouldReconnect) {
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    setTimeout(() => connectToWhatsApp(), retryCount * 1000); // Exponential backoff
                } else {
                    console.error('Max retries reached. Please check manual intervention.');
                }
            } else {
                console.log('Logged out. Please scan QR code again.');
                // Optional: clear auth folder here to reset state
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    console.log('New Message:', JSON.stringify(msg, null, 2));
                    // Future: Insert into `message_logs` table here
                }
            }
        }
    });
}

const getQRCode = () => qrCode;

// --- Helper: Get JID ---
const formatJid = (phone) => {
    if (!phone) return null;
    return phone.includes('@s.whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
}

// --- Sending Functions ---

const sendMessage = async (jid, content, options = {}) => {
    if (!sock) throw new Error('WhatsApp socket not connected');
    return await sock.sendMessage(jid, content, options);
};

const sendText = async (jid, text) => {
    return await sendMessage(jid, { text });
};

const sendImage = async (jid, imageUrl, caption = '') => {
    return await sendMessage(jid, { image: { url: imageUrl }, caption });
};

const sendVideo = async (jid, videoUrl, caption = '', gifPlayback = false) => {
    return await sendMessage(jid, { video: { url: videoUrl }, caption, gifPlayback });
};

const sendAudio = async (jid, audioUrl, ptt = false) => {
    return await sendMessage(jid, { audio: { url: audioUrl }, ptt, mimetype: 'audio/mp4' });
};

const sendDocument = async (jid, docUrl, fileName, mimetype) => {
    return await sendMessage(jid, { document: { url: docUrl }, fileName, mimetype });
};

const sendLocation = async (jid, lat, long) => {
    return await sendMessage(jid, { location: { degreesLatitude: lat, degreesLongitude: long } });
};

const sendContact = async (jid, name, phone) => {
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
    });
};

const sendPoll = async (jid, name, values, singleSelect = false) => {
    return await sendMessage(jid, {
        poll: {
            name: name,
            values: values,
            selectableCount: singleSelect ? 1 : values.length
        }
    });
};

const updatePresence = async (jid, type) => {
    if (!sock) throw new Error('WhatsApp socket not connected');
    return await sock.sendPresenceUpdate(type, jid);
};

export {
    connectToWhatsApp,
    getQRCode,
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
    updatePresence
};
