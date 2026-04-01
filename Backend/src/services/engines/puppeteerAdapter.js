import { EngineAdapter } from './engineAdapter.js';

const PUPPETEER_RUNTIME_MODE = process.env.PUPPETEER_RUNTIME_MODE || 'in-memory-mvp';
const sessionState = new Map();

const getStatus = (sessionId) => sessionState.get(sessionId) || 'DISCONNECTED';

const requireConnected = (sessionId) => {
    const status = getStatus(sessionId);
    if (status !== 'CONNECTED') {
        throw new Error(`Puppeteer session '${sessionId}' is not connected`);
    }
};

export class PuppeteerAdapter extends EngineAdapter {
    constructor() {
        super('puppeteer');
    }

    async connect(sessionId, options = {}) {
        sessionState.set(sessionId, 'CONNECTING');

        if (options?.simulateFailure) {
            sessionState.set(sessionId, 'DISCONNECTED');
            throw new Error('Puppeteer connect simulation failed');
        }

        sessionState.set(sessionId, 'CONNECTED');
        return {
            engineType: 'puppeteer',
            sessionId,
            status: 'CONNECTED',
            mode: PUPPETEER_RUNTIME_MODE,
        };
    }

    async disconnect(sessionId) {
        sessionState.set(sessionId, 'DISCONNECTED');
        return {
            engineType: 'puppeteer',
            sessionId,
            status: 'DISCONNECTED',
            mode: PUPPETEER_RUNTIME_MODE,
        };
    }

    async sendText(sessionId, jid, text) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            message: text,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async sendImage(sessionId, jid, imageUrl, caption = '') {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            imageUrl,
            caption,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async sendVideo(sessionId, jid, videoUrl, caption = '', gifPlayback = false) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            videoUrl,
            caption,
            gifPlayback,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async sendAudio(sessionId, jid, audioUrl, ptt = false) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            audioUrl,
            ptt,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async sendDocument(sessionId, jid, docUrl, fileName, mimetype) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            docUrl,
            fileName,
            mimetype,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async sendLocation(sessionId, jid, latitude, longitude) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            latitude,
            longitude,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async sendContact(sessionId, jid, contactName, contactPhone) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            contactName,
            contactPhone,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async sendPoll(sessionId, jid, name, values, singleSelect = false) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            name,
            values,
            singleSelect,
            transport: 'mvp',
            timestamp: new Date().toISOString(),
        };
    }

    async updatePresence(sessionId, jid, type) {
        requireConnected(sessionId);
        return {
            engineType: 'puppeteer',
            sessionId,
            jid,
            type,
            transport: 'mvp',
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
            message: 'Puppeteer MVP is running in controlled in-memory mode',
        };
    }
}
