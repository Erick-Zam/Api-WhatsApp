import { BaileysAdapter } from './engines/baileysAdapter.js';
import { PuppeteerAdapter } from './engines/puppeteerAdapter.js';
import { assertAdapterContract } from './engines/adapterContract.js';
import {
    getSessionEngineConfig,
    getSessionEngineConfigBySessionId,
    recordSessionEngineMetric,
    updateSessionEngineHealth,
} from './sessionEngine.js';

const adapters = {
    baileys: new BaileysAdapter(),
    puppeteer: new PuppeteerAdapter(),
};

Object.entries(adapters).forEach(([name, adapter]) => {
    assertAdapterContract(name, adapter);
});

const resolveEngineConfig = async (sessionId, userId = null) => {
    if (userId) {
        const config = await getSessionEngineConfig(sessionId, userId);
        if (config) return config;
    }
    return getSessionEngineConfigBySessionId(sessionId);
};

export const getSessionAdapter = async (sessionId, userId = null) => {
    const config = await resolveEngineConfig(sessionId, userId);
    const engineType = config?.engineType || 'baileys';
    return {
        adapter: adapters[engineType] || adapters.baileys,
        engineType,
        engineConfig: config?.engineConfig || {},
    };
};

export const getRegisteredEngines = () => Object.keys(adapters);

const withHealthUpdate = async (sessionId, engineType, action) => {
    const startedAt = Date.now();
    try {
        const result = await action();
        const latencyMs = Date.now() - startedAt;

        await recordSessionEngineMetric({
            sessionId,
            engineType,
            latencyMs,
            errorRate: 0,
            activeConnections: 1,
        }).catch(() => {
            // Metrics are best-effort only.
        });

        await updateSessionEngineHealth({ sessionId, healthStatus: 'healthy', lastError: null });
        return result;
    } catch (error) {
        const latencyMs = Date.now() - startedAt;

        await recordSessionEngineMetric({
            sessionId,
            engineType,
            latencyMs,
            errorRate: 100,
            activeConnections: 0,
        }).catch(() => {
            // Metrics are best-effort only.
        });

        await updateSessionEngineHealth({
            sessionId,
            healthStatus: 'unhealthy',
            lastError: error.message,
        }).catch(() => {
            // Avoid masking original error when DB health update fails.
        });
        throw error;
    }
};

export const connectSession = async ({ sessionId, userId = null, options = {} }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.connect(sessionId, options));
};

export const disconnectSession = async ({ sessionId, userId = null }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.disconnect(sessionId));
};

export const getSessionHealth = async ({ sessionId, userId = null }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    const health = await adapter.health(sessionId);
    return { engineType, ...health };
};

export const sendTextMessage = async ({ sessionId, userId = null, jid, message }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendText(sessionId, jid, message));
};

export const sendImageMessage = async ({ sessionId, userId = null, jid, imageUrl, caption = '' }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendImage(sessionId, jid, imageUrl, caption));
};

export const sendVideoMessage = async ({ sessionId, userId = null, jid, videoUrl, caption = '', gifPlayback = false }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendVideo(sessionId, jid, videoUrl, caption, gifPlayback));
};

export const sendAudioMessage = async ({ sessionId, userId = null, jid, audioUrl, ptt = false }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendAudio(sessionId, jid, audioUrl, ptt));
};

export const sendDocumentMessage = async ({ sessionId, userId = null, jid, docUrl, fileName, mimetype }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendDocument(sessionId, jid, docUrl, fileName, mimetype));
};

export const sendLocationMessage = async ({ sessionId, userId = null, jid, latitude, longitude }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendLocation(sessionId, jid, latitude, longitude));
};

export const sendContactMessage = async ({ sessionId, userId = null, jid, contactName, contactPhone }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendContact(sessionId, jid, contactName, contactPhone));
};

export const sendPollMessage = async ({ sessionId, userId = null, jid, name, values, singleSelect = false }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.sendPoll(sessionId, jid, name, values, singleSelect));
};

export const sendPresenceUpdate = async ({ sessionId, userId = null, jid, type }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, () => adapter.updatePresence(sessionId, jid, type));
};
