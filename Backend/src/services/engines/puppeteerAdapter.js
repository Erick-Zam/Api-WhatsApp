import { EngineAdapter } from './engineAdapter.js';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import { triggerWebhooks } from '../webhooks.js';
import fs from 'fs';
import path from 'path';

const PUPPETEER_RUNTIME_MODE = 'whatsapp-web.js';
const sessionState = new Map();
const qrCodes = new Map();
const clients = new Map();
const sessionUsers = new Map();

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

export class PuppeteerAdapter extends EngineAdapter {
    constructor() {
        super('puppeteer');
    }

    async connect(sessionId, options = {}) {
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

        client.on('qr', (qr) => {
            qrCodes.set(sessionId, qr);
            console.log(`[QR GENERATED] Puppeteer Session '${sessionId}' - Length: ${qr.length}`);
            triggerWebhooks(sessionId, 'connection.update', { connection: 'open', qr: 'QR_RECEIVED' });
        });

        client.on('ready', () => {
            qrCodes.delete(sessionId);
            sessionState.set(sessionId, 'CONNECTED');
            sessionUsers.set(sessionId, client.info ? client.info.wid.user : null);
            console.log(`[Puppeteer] Session '${sessionId}' connected to WhatsApp!`);
            triggerWebhooks(sessionId, 'connection.update', { connection: 'open' });
        });

        client.on('authenticated', () => {
            console.log(`[Puppeteer] Session '${sessionId}' authenticated!`);
            qrCodes.delete(sessionId);
        });

        client.on('auth_failure', (msg) => {
            console.error(`[Puppeteer] Session '${sessionId}' auth failure:`, msg);
            sessionState.set(sessionId, 'DISCONNECTED');
            qrCodes.delete(sessionId);
            triggerWebhooks(sessionId, 'connection.update', { connection: 'close', error: msg });
        });

        client.on('disconnected', (reason) => {
            console.log(`[Puppeteer] Session '${sessionId}' disconnected:`, reason);
            sessionState.set(sessionId, 'DISCONNECTED');
            qrCodes.delete(sessionId);
            sessionUsers.delete(sessionId);
            clients.delete(sessionId);
            triggerWebhooks(sessionId, 'connection.update', { connection: 'close', reason });
        });

        client.on('message', async (msg) => {
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
                pushName: msg._data?.notifyName || msg.from
            };
            
            console.log(`[Puppeteer] New Message on ${sessionId}: ${msg.from} - ${msg.body}`);
            triggerWebhooks(sessionId, 'messages.upsert', payload);
        });

        client.on('message_ack', (msg, ack) => {
            // map acks
            const statusMap = { 1: 1, 2: 2, 3: 3, 4: 4 }; // sent, received, read, etc.
            const payload = {
                key: { remoteJid: msg.from, fromMe: msg.fromMe, id: msg.id.id },
                update: { status: statusMap[ack] || ack }
            };
            triggerWebhooks(sessionId, 'messages.update', payload);
        });

        try {
            client.initialize();
        } catch (e) {
            console.error(`[Puppeteer] Initialization error for ${sessionId}:`, e);
            sessionState.set(sessionId, 'DISCONNECTED');
            throw e;
        }

        return {
            engineType: 'puppeteer',
            sessionId,
            status: 'CONNECTING',
            mode: PUPPETEER_RUNTIME_MODE,
        };
    }

    async disconnect(sessionId) {
        const client = clients.get(sessionId);
        if (client) {
            try {
                await client.logout();
            } catch (e) {
                console.error(`[Puppeteer] Error logging out ${sessionId}:`, e);
            }
            try {
                await client.destroy();
            } catch (e) {
                console.error(`[Puppeteer] Error destroying ${sessionId}:`, e);
            }
        }
        
        sessionState.set(sessionId, 'DISCONNECTED');
        qrCodes.delete(sessionId);
        clients.delete(sessionId);
        sessionUsers.delete(sessionId);

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
