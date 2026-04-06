import { EngineAdapter } from './engineAdapter.js';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import { triggerWebhooks } from '../webhooks.js';
import { saveMessage } from '../messageArchive.js';
import fs from 'fs';
import path from 'path';

const PUPPETEER_RUNTIME_MODE = 'whatsapp-web.js';
const sessionState = new Map();
const qrCodes = new Map();
const clients = new Map();
const sessionUsers = new Map();
const connectPromises = new Map();
const sessionGenerations = new Map();

const getStatus = (sessionId) => sessionState.get(sessionId) || 'DISCONNECTED';

const requireConnected = (sessionId) => {
    const status = getStatus(sessionId);
    if (status !== 'CONNECTED') {
        throw new Error(`Puppeteer session '${sessionId}' is not connected`);
    }
};

const formatJid = (jid) => {
    if (!jid) return null;
    let cleaned = jid.replaceAll(/\D/g, '');
    if (cleaned.includes('@c.us') || cleaned.includes('@g.us')) return cleaned;
    return `${cleaned}@c.us`; // whatsapp-web.js uses @c.us for contacts
};

const withTimeout = async (promise, timeoutMs, label) => {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const isNavigationRaceError = (error) => {
    const msg = String(error?.message || error || '').toLowerCase();
    return msg.includes('execution context was destroyed')
        || msg.includes('cannot find context with specified id')
        || msg.includes('target closed');
};

const teardownClient = async (sessionId, client) => {
    if (!client) return;

    try {
        await withTimeout(Promise.resolve(client.destroy()), 8000, `destroy(${sessionId})`);
    } catch (error) {
        const logFn = isNavigationRaceError(error) ? console.warn : console.error;
        logFn(`[Puppeteer] Error destroying ${sessionId}:`, error?.message || error);
    }
};

export class PuppeteerAdapter extends EngineAdapter {
    constructor() {
        super('puppeteer');
    }

    async connect(sessionId, options = {}) {
        if (connectPromises.has(sessionId)) {
            return connectPromises.get(sessionId);
        }

        const existingClient = clients.get(sessionId);
        if (existingClient && !options.forceReconnect) {
            const currentStatus = getStatus(sessionId);
            if (currentStatus === 'CONNECTED' || currentStatus === 'CONNECTING') {
                return {
                    engineType: 'puppeteer',
                    sessionId,
                    status: currentStatus,
                    mode: PUPPETEER_RUNTIME_MODE,
                };
            }
        }

        const connectPromise = (async () => {
            sessionState.set(sessionId, 'CONNECTING');

            const storeDir = path.join(process.cwd(), 'store_puppeteer');
            if (!fs.existsSync(storeDir)) {
                fs.mkdirSync(storeDir, { recursive: true });
            }

            if (options.deleteOld) {
                try {
                    const sessionPath = path.join(storeDir, `session-${sessionId}`);
                    if (fs.existsSync(sessionPath)) {
                        fs.rmSync(sessionPath, { recursive: true, force: true });
                        console.log(`[Puppeteer] Cleaned up session data for ${sessionId}`);
                    }
                } catch (e) {
                    console.error(`[Puppeteer] Clean up error for ${sessionId}:`, e);
                }
            }

            const currentClient = clients.get(sessionId);
            if (currentClient) {
                clients.delete(sessionId);
                await teardownClient(sessionId, currentClient);
            }

            const generation = (sessionGenerations.get(sessionId) || 0) + 1;
            sessionGenerations.set(sessionId, generation);

            const client = new Client({
                authStrategy: new LocalAuth({
                    clientId: sessionId,
                    dataPath: storeDir
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                }
            });

            clients.set(sessionId, client);

            const isCurrentClient = () => clients.get(sessionId) === client && sessionGenerations.get(sessionId) === generation;
            const onceFlags = {
                authenticated: false,
                ready: false,
                disconnected: false,
            };

            client.on('qr', (qr) => {
                if (!isCurrentClient()) return;
                if (getStatus(sessionId) === 'CONNECTED') return;

                qrCodes.set(sessionId, qr);
                console.log(`[QR GENERATED] Puppeteer Session '${sessionId}' - Length: ${qr.length}`);
                triggerWebhooks(sessionId, 'connection.update', { connection: 'open', qr: 'QR_RECEIVED' });
            });

            client.on('ready', () => {
                if (!isCurrentClient()) return;
                if (onceFlags.ready) return;
                onceFlags.ready = true;

                qrCodes.delete(sessionId);
                sessionState.set(sessionId, 'CONNECTED');
                sessionUsers.set(sessionId, client.info ? client.info.wid.user : null);
                console.log(`[Puppeteer] Session '${sessionId}' connected to WhatsApp!`);
                triggerWebhooks(sessionId, 'connection.update', { connection: 'open' });
            });

            client.on('authenticated', () => {
                if (!isCurrentClient()) return;
                if (onceFlags.authenticated) return;
                onceFlags.authenticated = true;

                console.log(`[Puppeteer] Session '${sessionId}' authenticated!`);
                qrCodes.delete(sessionId);
            });

            client.on('auth_failure', (msg) => {
                if (!isCurrentClient()) return;

                console.error(`[Puppeteer] Session '${sessionId}' auth failure:`, msg);
                sessionState.set(sessionId, 'DISCONNECTED');
                qrCodes.delete(sessionId);
                sessionUsers.delete(sessionId);
                triggerWebhooks(sessionId, 'connection.update', { connection: 'close', error: msg });
            });

            client.on('disconnected', async (reason) => {
                if (!isCurrentClient()) return;
                if (onceFlags.disconnected) return;
                onceFlags.disconnected = true;

                console.log(`[Puppeteer] Session '${sessionId}' disconnected:`, reason);
                sessionState.set(sessionId, 'DISCONNECTED');
                qrCodes.delete(sessionId);
                sessionUsers.delete(sessionId);
                clients.delete(sessionId);
                triggerWebhooks(sessionId, 'connection.update', { connection: 'close', reason });

                await teardownClient(sessionId, client);
            });

            client.on('message', async (msg) => {
                if (!isCurrentClient()) return;
                try {
                    // Trigger webhook matching Baileys-like format
                    const payload = {
                        key: {
                            remoteJid: msg.from,
                            fromMe: msg.fromMe,
                            id: msg.id.id
                        },
                        message: {
                            conversation: msg.body
                        },
                        pushName: msg._data?.notifyName || msg.from,
                        messageTimestamp: msg.timestamp,
                    };

                    console.log(`[Puppeteer] New Message on ${sessionId}: ${msg.from} - ${msg.body}`);
                    saveMessage(sessionId, payload).catch((error) => {
                        console.error(`[Puppeteer] Failed to archive incoming message on ${sessionId}:`, error?.message || error);
                    });
                    triggerWebhooks(sessionId, 'messages.upsert', payload);
                } catch (error) {
                    console.error(`[Puppeteer] Message handler error on ${sessionId}:`, error?.message || error);
                }
            });

            client.on('message_ack', (msg, ack) => {
                if (!isCurrentClient()) return;
                try {
                    // map acks
                    const statusMap = { 1: 1, 2: 2, 3: 3, 4: 4 }; // sent, received, read, etc.
                    const payload = {
                        key: { remoteJid: msg.from, fromMe: msg.fromMe, id: msg.id.id },
                        update: { status: statusMap[ack] || ack }
                    };
                    triggerWebhooks(sessionId, 'messages.update', payload);
                } catch (error) {
                    console.error(`[Puppeteer] Ack handler error on ${sessionId}:`, error?.message || error);
                }
            });

            try {
                await Promise.resolve(client.initialize());
            } catch (e) {
                console.error(`[Puppeteer] Initialization error for ${sessionId}:`, e);
                sessionState.set(sessionId, 'DISCONNECTED');
                clients.delete(sessionId);
                sessionUsers.delete(sessionId);
                qrCodes.delete(sessionId);
                await teardownClient(sessionId, client);
                throw e;
            }

            return {
                engineType: 'puppeteer',
                sessionId,
                status: 'CONNECTING',
                mode: PUPPETEER_RUNTIME_MODE,
            };
        })().finally(() => {
            connectPromises.delete(sessionId);
        });

        connectPromises.set(sessionId, connectPromise);
        return connectPromise;
    }

    async disconnect(sessionId) {
        sessionState.set(sessionId, 'DISCONNECTED');

        if (connectPromises.has(sessionId)) {
            try {
                await connectPromises.get(sessionId);
            } catch {
                // Ignore in-flight connect error while forcing disconnect.
            }
        }

        const client = clients.get(sessionId);
        if (client) {
            try {
                await withTimeout(Promise.resolve(client.logout()), 8000, `logout(${sessionId})`);
            } catch (e) {
                const logFn = isNavigationRaceError(e) ? console.warn : console.error;
                logFn(`[Puppeteer] Error logging out ${sessionId}:`, e?.message || e);
            }
            clients.delete(sessionId);
            await teardownClient(sessionId, client);
        }

        qrCodes.delete(sessionId);
        sessionUsers.delete(sessionId);
        sessionGenerations.delete(sessionId);
        connectPromises.delete(sessionId);

        return {
            engineType: 'puppeteer',
            sessionId,
            status: 'DISCONNECTED',
            mode: PUPPETEER_RUNTIME_MODE,
        };
    }

    async sendText(sessionId, jid, text) {
        requireConnected(sessionId);
        const client = clients.get(sessionId);
        const response = await client.sendMessage(formatJid(jid), text);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            message: text,
            messageId: response.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async sendImage(sessionId, jid, imageUrl, caption = '') {
        requireConnected(sessionId);
        const { MessageMedia } = pkg;
        const client = clients.get(sessionId);
        // Using MessageMedia.fromUrl requires downloading it. 
        // For simplicity, we assume we want to download and send.
        const media = await MessageMedia.fromUrl(imageUrl);
        const response = await client.sendMessage(formatJid(jid), media, { caption });
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            imageUrl,
            caption,
            messageId: response.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async sendVideo(sessionId, jid, videoUrl, caption = '', gifPlayback = false) {
        requireConnected(sessionId);
        const { MessageMedia } = pkg;
        const client = clients.get(sessionId);
        const media = await MessageMedia.fromUrl(videoUrl);
        const response = await client.sendMessage(formatJid(jid), media, { caption, sendVideoAsGif: gifPlayback });
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            videoUrl,
            caption,
            gifPlayback,
            messageId: response.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async sendAudio(sessionId, jid, audioUrl, ptt = false) {
        requireConnected(sessionId);
        const { MessageMedia } = pkg;
        const client = clients.get(sessionId);
        const media = await MessageMedia.fromUrl(audioUrl);
        const response = await client.sendMessage(formatJid(jid), media, { sendAudioAsVoice: ptt });
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            audioUrl,
            ptt,
            messageId: response.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async sendDocument(sessionId, jid, docUrl, fileName, mimetype) {
        requireConnected(sessionId);
        const { MessageMedia } = pkg;
        const client = clients.get(sessionId);
        const media = await MessageMedia.fromUrl(docUrl);
        if (fileName) media.filename = fileName;
        if (mimetype) media.mimetype = mimetype;
        const response = await client.sendMessage(formatJid(jid), media);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            docUrl,
            fileName,
            mimetype,
            messageId: response.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async sendLocation(sessionId, jid, latitude, longitude) {
        requireConnected(sessionId);
        const { Location } = pkg;
        const client = clients.get(sessionId);
        const loc = new Location(latitude, longitude);
        const response = await client.sendMessage(formatJid(jid), loc);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            latitude,
            longitude,
            messageId: response.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async sendContact(sessionId, jid, contactName, contactPhone) {
        requireConnected(sessionId);
        const client = clients.get(sessionId);
        // WA-Web.js expects a Contact object which is hard to mock directly without querying.
        // As a fallback, we pass a vcard directly.
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + `FN:${contactName}\n`
            + `TEL;type=CELL;type=VOICE;waid=${contactPhone.replace(/\D/g,'')}:${contactPhone}\n`
            + 'END:VCARD';
        
        let response;
        try {
            // Attempt to send as text if the library doesn't accept vcard directly this way
            // or we try sending an object that resembles a contact
            response = await client.sendMessage(formatJid(jid), vcard); 
        } catch(e) {
            response = await client.sendMessage(formatJid(jid), `Contact: ${contactName} - ${contactPhone}`);
        }
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            contactName,
            contactPhone,
            messageId: response?.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async sendPoll(sessionId, jid, name, values, singleSelect = false) {
        requireConnected(sessionId);
        const { Poll } = pkg;
        const client = clients.get(sessionId);
        const poll = new Poll(name, values, { allowMultipleAnswers: !singleSelect });
        const response = await client.sendMessage(formatJid(jid), poll);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            name,
            values,
            singleSelect,
            messageId: response?.id?.id,
            timestamp: new Date().toISOString(),
        };
    }

    async updatePresence(sessionId, jid, type) {
        requireConnected(sessionId);
        const client = clients.get(sessionId);
        // e.g. type = 'composing', 'recording', 'paused'
        if (type === 'composing') await client.sendChatstate(formatJid(jid), 0); // typing
        else if (type === 'recording') await client.sendChatstate(formatJid(jid), 1); // recording
        else await client.sendChatstate(formatJid(jid), 2); // stop
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            type,
            timestamp: new Date().toISOString(),
        };
    }

    async getChats(sessionId, options = {}) {
        requireConnected(sessionId);
        const client = clients.get(sessionId);
        const { limit = 100, before } = options;
        const maxItems = Math.max(1, Math.min(limit, 500));
        const beforeTimestamp = before ? Number.parseInt(String(before), 10) : null;

        const allChats = await client.getChats();
        const mapped = allChats
            .map((chat) => {
                const timestamp = chat.timestamp || 0;
                return {
                    id: chat.id?._serialized || chat.id?.server || chat.id || '',
                    name: chat.name || chat.formattedTitle || chat.id?.user || '',
                    unreadCount: chat.unreadCount || 0,
                    conversationTimestamp: timestamp,
                    lastMessage: chat.lastMessage?.body || 'Click to view history',
                    isGroup: Boolean(chat.isGroup),
                };
            })
            .filter((chat) => chat.id && chat.id !== 'status@broadcast')
            .filter((chat) => !chat.id.endsWith('@broadcast'))
            .sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0));

        const filtered = beforeTimestamp
            ? mapped.filter((chat) => (chat.conversationTimestamp || 0) < beforeTimestamp)
            : mapped;

        const items = filtered.slice(0, maxItems);
        const hasMore = filtered.length > items.length;
        const nextCursor = hasMore && items.length > 0
            ? String(items[items.length - 1].conversationTimestamp || 0)
            : null;

        return { items, hasMore, nextCursor };
    }

    async getMessages(sessionId, jid, options = {}) {
        requireConnected(sessionId);
        const client = clients.get(sessionId);
        const { limit = 50, before } = options;
        const maxItems = Math.max(1, Math.min(limit, 500));
        const beforeTimestamp = before ? Number.parseInt(String(before), 10) : null;

        const chatId = jid?.includes('@') ? jid : formatJid(jid);
        const chat = await client.getChatById(chatId);
        const fetchLimit = Math.max(maxItems * 3, 150);
        const rawMessages = await chat.fetchMessages({ limit: fetchLimit });

        let filtered = rawMessages
            .map((msg) => ({
                key: {
                    remoteJid: msg.fromMe ? (msg.to || chatId) : (msg.from || chatId),
                    fromMe: Boolean(msg.fromMe),
                    id: msg.id?.id || msg.id?._serialized || String(msg.timestamp || Date.now()),
                },
                message: {
                    conversation: msg.body || '',
                },
                pushName: msg._data?.notifyName || null,
                messageTimestamp: msg.timestamp || 0,
            }))
            .sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

        if (beforeTimestamp) {
            filtered = filtered.filter((msg) => (msg.messageTimestamp || 0) < beforeTimestamp);
        }

        const items = filtered.slice(-maxItems);
        const hasMore = filtered.length > items.length;
        const nextCursor = hasMore && items.length > 0
            ? String(items[0].messageTimestamp || 0)
            : null;

        return { items, hasMore, nextCursor };
    }

    async health(sessionId) {
        const status = getStatus(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            status,
            healthy: status === 'CONNECTED',
            mode: PUPPETEER_RUNTIME_MODE,
            timestamp: new Date().toISOString(),
            message: 'Puppeteer engine is running',
        };
    }

    // Specific to adapter to expose getQRCode
    getQRCode(sessionId) {
        return qrCodes.get(sessionId);
    }

    getConnectionStatus(sessionId) {
        return getStatus(sessionId);
    }
    
    getConnectedUser(sessionId) {
        return sessionUsers.get(sessionId) ? { id: sessionUsers.get(sessionId) } : null;
    }
}
