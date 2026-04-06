import express from 'express';
import {
    getAvailableEngines,
    getSessionEngineMetrics,
    getSessionEngineConfig,
    isEngineEnabled,
    isAllowedEngine,
    setSessionEngineConfig,
} from '../services/sessionEngine.js';
import { getSessionHealth } from '../services/sessionOrchestrator.js';
import { getAllSessionHealth } from '../services/sessionHealthMonitor.js';

const router = express.Router();

router.get('/available-engines', async (_req, res) => {
    try {
        return res.json({ engines: getAvailableEngines() });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.get('/health/all', async (_req, res) => {
    try {
        const allHealth = getAllSessionHealth();
        return res.json({
            count: allHealth.length,
            sessions: allHealth,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.get('/:sessionId/engine', async (req, res) => {
    try {
        const config = await getSessionEngineConfig(req.params.sessionId, req.user.id);
        if (!config) {
            return res.status(404).json({ error: 'Session not found' });
        }
        return res.json(config);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.put('/:sessionId/engine', async (req, res) => {
    try {
        const { engineType, engineConfig } = req.body;

        if (!engineType || typeof engineType !== 'string') {
            return res.status(400).json({ error: 'engineType is required' });
        }

        if (!isAllowedEngine(engineType)) {
            return res.status(400).json({ error: 'Unsupported engineType. Allowed values: baileys, puppeteer' });
        }

        if (!isEngineEnabled(engineType)) {
            return res.status(400).json({ error: `Engine '${engineType}' is currently disabled` });
        }

        const updated = await setSessionEngineConfig({
            sessionId: req.params.sessionId,
            userId: req.user.id,
            engineType,
            engineConfig: engineConfig || {},
        });

        if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
        }

        return res.json({ message: 'Engine configuration updated', config: updated });
    } catch (error) {
        if (/requires DISCONNECTED/i.test(error.message)) {
            return res.status(409).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
});

router.get('/:sessionId/health', async (req, res) => {
    try {
        const config = await getSessionEngineConfig(req.params.sessionId, req.user.id);
        if (!config) {
            return res.status(404).json({ error: 'Session not found' });
        }

        let runtimeStatus = config.status;
        let healthMessage;
        try {
            const health = await getSessionHealth({
                sessionId: req.params.sessionId,
                userId: req.user.id,
            });
            runtimeStatus = health.status || runtimeStatus;
            healthMessage = health.message;
        } catch {
            // Keep DB status if orchestrator health check fails.
        }

        return res.json({
            sessionId: config.sessionId,
            engineType: config.engineType,
            status: runtimeStatus,
            healthStatus: config.healthStatus,
            lastHeartbeatAt: config.lastHeartbeatAt,
            lastError: config.lastError,
            message: healthMessage,
            updatedAt: config.updatedAt,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.get('/:sessionId/metrics', async (req, res) => {
    try {
        const config = await getSessionEngineConfig(req.params.sessionId, req.user.id);
        if (!config) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
        const metrics = await getSessionEngineMetrics(req.params.sessionId, Number.isNaN(limit) ? 20 : limit);

        return res.json({
            sessionId: req.params.sessionId,
            count: metrics.length,
            metrics,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
