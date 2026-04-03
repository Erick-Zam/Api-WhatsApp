import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { makeInMemoryStore } from './services/simpleStore.js';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import { triggerWebhooks } from './services/webhooks.js';

// Session storage
const sessions = new Map(); // sessionId -> socket
const qrCodes = new Map(); // sessionId -> qrCode
const retryCounts = new Map(); // sessionId -> retryCount
const MAX_RETRIES = 5;
const AUTH_DIR = 'auth_info_baileys';
const STORE_DIR = 'store_baileys';

// Basic rate limiting
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_MINUTE = 10;
const messageTracking = new Map(); // sessionId -> { timestamp, count }
const DEBUG_WA_UPDATES = process.env.DEBUG_WA_UPDATES === 'true';

// Store setup
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
}

// Bind store to file
const storeFile = path.join(STORE_DIR, 'baileys_store_multi.json');
store.readFromFile(storeFile);
setInterval(() => {
    store.writeToFile(storeFile);
}, 10_000);

// Helper to get session ID from request or default
const getSession = (sessionId = 'default') => sessions.get(sessionId);

/**
 * Connect to WhatsApp with a specific session ID
 */
async function connectToWhatsApp(sessionId = 'default', options = {}) {
    // Store in subfolder of the mounted volume for persistence
    const sessionDir = path.join(AUTH_DIR, sessionId);

    // Force cleanup if requested
    if (options.deleteOld) {
        try {
            retryCounts.set(sessionId, 0); // Explicitly reset retries
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`[Connect] Forced cleanup of session '${sessionId}' before start.`);
            }
        } catch (e) {
            console.error(`[Connect] Error cleaning up session '${sessionId}':`, e);
        }
    }

    // Ensure parent dir exists
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // Fetch latest version to avoid 405 Method Not Allowed (Connection Failure)
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[Connect] Using WA v${version.join('.')} (isLatest: ${isLatest})`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // We handle QR via API/Sockets
        logger: pino({ level: 'silent' }),
        browser: ['WhatsApp SaaS', 'Chrome', '1.0.0'], // Standard browser signature
        syncFullHistory: true, // Sync full history for comprehensive chat view
        markOnlineOnConnect: false, // Only mark online when active

        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: 'hello' };
        }
    });

    // Bind store to socket
    store.bind(sock.ev);

    // Store session
    sessions.set(sessionId, sock);

    // Create per-session store
    const sessionStore = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
    const sessionStoreFile = path.join(STORE_DIR, `${sessionId}_store.json`);
    sessionStore.readFromFile(sessionStoreFile);
    setInterval(() => {
        sessionStore.writeToFile(sessionStoreFile);
    }, 10_000);

    sessionStore.bind(sock.ev);
    sessionStores.set(sessionId, sessionStore);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (DEBUG_WA_UPDATES) {
            console.log(`[DEBUG_CONNECTION] Session ${sessionId} Update:`, JSON.stringify(update, null, 2));
        } else if (connection || qr) {
            console.log(`[CONNECTION] Session ${sessionId}:`, {
                connection: connection || 'update',
                hasQr: Boolean(qr),
            });
        }

        // Trigger generic connection update webhook
        triggerWebhooks(sessionId, 'connection.update', { connection, qr: qr ? 'QR_RECEIVED' : undefined });

        if (qr) {
            qrCodes.set(sessionId, qr);
            console.log(`[QR GENERATED] Session '${sessionId}' - Length: ${qr.length}`);
        } else {
            console.log(`[QR UPDATE] Session '${sessionId}' - Updates (no QR in this packet)`);
        }

        if (connection === 'open') {
            qrCodes.delete(sessionId);
            retryCounts.set(sessionId, 0);
            console.log(`Session '${sessionId}' connected to WhatsApp!`);

            // Generate API Key ONLY on successful connection
            import('./services/apiKeys.js').then(({ createSessionKey }) => {
                createSessionKey(sessionId).catch(e => console.error(`Error creating key for ${sessionId}:`, e));
            }).catch((e) => {
                console.error(`Error loading apiKeys module for ${sessionId}:`, e);
            });

        } else if (connection === 'close') {
            qrCodes.delete(sessionId);
            sessions.delete(sessionId); // Remove closed session

            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`Session '${sessionId}' closed. Reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                const currentRetry = retryCounts.get(sessionId) || 0;
                
                // Error 515 (restart required) is a specific edge case where the session needs to be restarted
                // It usually resolves on immediate reconnect, but if it cycles, we should clean up.
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                if (statusCode === 515 && currentRetry >= 3) {
                     console.error(`Error 515 persists for ${sessionId}. Purging session to force clean login.`);
                     if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
                }

                if (currentRetry < MAX_RETRIES) {
                    retryCounts.set(sessionId, currentRetry + 1);
                    setTimeout(() => {
                        connectToWhatsApp(sessionId).catch((err) => {
                            console.error(`Reconnect failed for ${sessionId}:`, err);
                        });
                    }, (currentRetry + 1) * 2000);
                } else {
                    console.error(`Max retries reached for session ${sessionId}.`);
                }
            } else {
                console.log(`Session '${sessionId}' logged out.`);
                // Do NOT delete key on simple logout/disconnect. 
                // We want to preserve ownership (userId) in DB.
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    if (msg.key.remoteJid !== 'status@broadcast') {
                        const messageType = msg.message ? Object.keys(msg.message)[0] : 'unknown';
                        console.log(`[${sessionId}] New Message`, {
                            jid: msg.key.remoteJid,
                            id: msg.key.id,
                            type: messageType,
                            timestamp: msg.messageTimestamp,
                        });
                    }
                    // Trigger webhook for new message
                    triggerWebhooks(sessionId, 'messages.upsert', msg);
                }
            }
        }
    });

    // Listen for contacts update
    sock.ev.on('contacts.update', (update) => {
        // Suppress massive logging and webhook trigger during sync to prevent event loop blockage
        // console.log(`[${sessionId}] Contacts Update:`, update.length);
        // triggerWebhooks(sessionId, 'contacts.update', update);
    });

    sock.ev.on('contacts.upsert', (contacts) => {
        // Suppress massive logging and webhook trigger during sync to prevent event loop blockage
        // console.log(`[${sessionId}] Contacts Upsert:`, contacts.length);
        // triggerWebhooks(sessionId, 'contacts.upsert', contacts);
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
            // Don't delete key on error, only on explicit deleteSession() call
        } finally {
            sessions.delete(sessionId);
            qrCodes.delete(sessionId);
            sessionStores.delete(sessionId); // Remove store from memory

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
        }).catch((e) => {
            console.error(`Error loading apiKeys module for delete ${sessionId}:`, e);
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


// Redoing store logic to be per-session to ensure isolation
const sessionStores = new Map();

// --- Rate Limiter Helper ---
const checkRateLimit = (sessionId) => {
    const now = Date.now();
    const tracker = messageTracking.get(sessionId) || { timestamp: now, count: 0 };

    if (now - tracker.timestamp > RATE_LIMIT_WINDOW) {
        tracker.timestamp = now;
        tracker.count = 1;
    } else {
        tracker.count++;
    }

    messageTracking.set(sessionId, tracker);

    if (tracker.count > MAX_MESSAGES_PER_MINUTE) {
        console.warn(`[RateLimit] Session ${sessionId} exceeded limit (${tracker.count}/${MAX_MESSAGES_PER_MINUTE})`);
        return false; // Limit exceeded
    }
    return true; // OK
};

// --- Helper: Get JID ---
const formatJid = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replaceAll(/\D/g, '');
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

    if (!checkRateLimit(sessionId)) {
        throw new Error('Rate limit exceeded. Please wait before sending more messages.');
    }

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


// --- New Capability Functions ---

const getChatSnippet = (msg) => {
    if (!msg || !msg.message) return '';
    const m = msg.message;
    const type = Object.keys(m)[0]; // Simplified
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage) return m.extendedTextMessage.text;
    if (m.imageMessage) return '📷 Photo';
    if (m.videoMessage) return '🎥 Video';
    if (m.audioMessage) return '🎵 Audio';
    if (m.documentMessage) return '📄 Document';
    if (m.pollCreationMessage || m.pollCreationMessageV2) return '📊 Poll';
    if (m.locationMessage) return '📍 Location';
    if (m.contactMessage || m.contactsArrayMessage) return '👤 Contact';
    return `[${type.replace('Message', '')}]`;
};

const getChats = (sessionId) => {
    const store = sessionStores.get(sessionId);
    if (!store) return [];

    const chats = store.chats.all();
    const contacts = store.contacts;

    // Enrich with names and last message snippets
    return chats.map(chat => {
        const contact = contacts[chat.id];

        // Priority: Chat Name > Contact Name > PushName > Verified Name > Phone Number
        const displayName = chat.name ||
            contact?.name ||
            contact?.notify ||
            contact?.verifiedName ||
            chat.id.replace('@s.whatsapp.net', '').replace('@g.us', '');

        // Find last message for snippet
        const msgs = store.messages[chat.id]?.array || [];
        const lastMsg = msgs[msgs.length - 1];
        const snippet = getChatSnippet(lastMsg);

        return {
            ...chat,
            name: displayName,
            lastMessage: snippet || 'Click to view history',
            isGroup: chat.id.endsWith('@g.us')
        };
    }).sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0));
};

const getContacts = (sessionId) => {
    const store = sessionStores.get(sessionId);
    if (!store) return {};
    return store.contacts;
};

const getMessages = (sessionId, jid, limit = 50) => {
    const store = sessionStores.get(sessionId);
    if (!store) return [];
    
    // Baileys structure: messages[jid].array
    const messages = store.messages[jid]?.array || [];
    
    // For each message, if it's from someone else and store has contact, add pushName if missing
    return messages.slice(-limit).map(msg => {
        if (!msg.key.fromMe && !msg.pushName) {
            const contact = store.contacts[msg.key.remoteJid];
            if (contact) {
                msg.pushName = contact.name || contact.notify;
            }
        }
        return msg;
    });
};

const createGroup = async (sessionId, subject, participants) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupCreate(subject, participants);
};

const getGroupMetadata = async (sessionId, jid) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupMetadata(jid);
};

const groupParticipantsUpdate = async (sessionId, jid, participants, action) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupParticipantsUpdate(jid, participants, action);
};

const groupUpdateSubject = async (sessionId, jid, subject) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupUpdateSubject(jid, subject);
};

const groupUpdateDescription = async (sessionId, jid, description) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupUpdateDescription(jid, description);
};

const groupInviteCode = async (sessionId, jid) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupInviteCode(jid);
};

const groupRevokeInvite = async (sessionId, jid) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupRevokeInvite(jid);
};

const groupLeave = async (sessionId, jid) => {
    const sock = sessions.get(sessionId);
    if (!sock) throw new Error(`Session '${sessionId}' not connected`);
    return await sock.groupLeave(jid);
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
    sendReaction,
    sendReply,
    getChats,
    getMessages,
    createGroup,
    getGroupMetadata,
    groupParticipantsUpdate,
    groupUpdateSubject,
    groupUpdateDescription,
    groupInviteCode,
    groupRevokeInvite,
    groupLeave
};

export default getConnectionStatus;
