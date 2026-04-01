import { BaileysAdapter } from './engines/baileysAdapter.js';
import { PuppeteerAdapter } from './engines/puppeteerAdapter.js';
import { assertAdapterContract } from './engines/adapterContract.js';
import {
    getSessionEngineConfig,
    getSessionEngineConfigBySessionId,
    recordSessionEngineMetric,
    updateSessionEngineHealth,
} from './sessionEngine.js';
import { executeWithCircuitBreaker, executeWithRetry, getCircuitState } from './circuitBreaker.js';
import { normalizeWTsocketOperationEvent, publishWTsocketEvent } from './wtsocketBus.js';

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

const withHealthUpdate = async (sessionId, engineType, actionName, action, userId = null) => {
    const startedAt = Date.now();
    const breakerKey = `${engineType}:${sessionId}`;
    try {
        const result = await executeWithRetry(
            (attempt) => executeWithCircuitBreaker(
                breakerKey,
                action,
                `${engineType}.${actionName}.attempt${attempt}`
            )
        );
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

        publishWTsocketEvent('engine.operation.success', normalizeWTsocketOperationEvent({
            sessionId,
            userId,
            engineType,
            action: actionName,
            success: true,
            latencyMs,
        }));

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

        publishWTsocketEvent('engine.operation.failed', normalizeWTsocketOperationEvent({
            sessionId,
            userId,
            engineType,
            action: actionName,
            success: false,
            latencyMs,
            error: error.message,
        }));

        throw error;
    }
};

export const connectSession = async ({ sessionId, userId = null, options = {} }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'connect', () => adapter.connect(sessionId, options), userId);
};

export const disconnectSession = async ({ sessionId, userId = null }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'disconnect', () => adapter.disconnect(sessionId), userId);
};

export const getSessionHealth = async ({ sessionId, userId = null }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    const health = await adapter.health(sessionId);
    return {
        engineType,
        ...health,
        circuitBreaker: getCircuitState(`${engineType}:${sessionId}`),
    };
};

export const sendTextMessage = async ({ sessionId, userId = null, jid, message }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendText', () => adapter.sendText(sessionId, jid, message), userId);
};

export const sendImageMessage = async ({ sessionId, userId = null, jid, imageUrl, caption = '' }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendImage', () => adapter.sendImage(sessionId, jid, imageUrl, caption), userId);
};

export const sendVideoMessage = async ({ sessionId, userId = null, jid, videoUrl, caption = '', gifPlayback = false }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendVideo', () => adapter.sendVideo(sessionId, jid, videoUrl, caption, gifPlayback), userId);
};

export const sendAudioMessage = async ({ sessionId, userId = null, jid, audioUrl, ptt = false }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendAudio', () => adapter.sendAudio(sessionId, jid, audioUrl, ptt), userId);
};

export const sendDocumentMessage = async ({ sessionId, userId = null, jid, docUrl, fileName, mimetype }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendDocument', () => adapter.sendDocument(sessionId, jid, docUrl, fileName, mimetype), userId);
};

export const sendLocationMessage = async ({ sessionId, userId = null, jid, latitude, longitude }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendLocation', () => adapter.sendLocation(sessionId, jid, latitude, longitude), userId);
};

export const sendContactMessage = async ({ sessionId, userId = null, jid, contactName, contactPhone }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendContact', () => adapter.sendContact(sessionId, jid, contactName, contactPhone), userId);
};

export const sendPollMessage = async ({ sessionId, userId = null, jid, name, values, singleSelect = false }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'sendPoll', () => adapter.sendPoll(sessionId, jid, name, values, singleSelect), userId);
};

export const sendPresenceUpdate = async ({ sessionId, userId = null, jid, type }) => {
    const { adapter, engineType } = await getSessionAdapter(sessionId, userId);
    return withHealthUpdate(sessionId, engineType, 'updatePresence', () => adapter.updatePresence(sessionId, jid, type), userId);
};
