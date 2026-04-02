import * as db from '../db.js';

const ALLOWED_ENGINES = ['baileys', 'puppeteer'];
const isPuppeteerEnabled = () => String(process.env.PUPPETEER_ENABLED || 'true').trim().toLowerCase() === 'true';
let queryRunner = db.query;

export const __setSessionEngineQueryRunnerForTests = (runner) => {
    queryRunner = runner || db.query;
};

const runQuery = (text, params) => queryRunner(text, params);

export const isAllowedEngine = (engineType) => ALLOWED_ENGINES.includes(engineType);

export const getAvailableEngines = () => ([
    {
        id: 'baileys',
        label: 'Baileys (WebSocket)',
        enabled: true,
        rollout: 100,
    },
    {
        id: 'puppeteer',
        label: 'Puppeteer (Browser)',
        enabled: isPuppeteerEnabled(),
        rollout: isPuppeteerEnabled() ? 10 : 0,
    },
]);

export const isEngineEnabled = (engineType) => {
    const engine = getAvailableEngines().find((item) => item.id === engineType);
    return Boolean(engine?.enabled);
};

export const getSessionEngineConfig = async (sessionId, userId) => {
    const result = await runQuery(
        `SELECT session_id, user_id, status, engine_type, engine_config, health_status, last_heartbeat_at, last_error, updated_at
         FROM whatsapp_sessions
         WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        sessionId: row.session_id,
        userId: row.user_id,
        status: row.status,
        engineType: row.engine_type || 'baileys',
        engineConfig: row.engine_config || {},
        healthStatus: row.health_status || 'unknown',
        lastHeartbeatAt: row.last_heartbeat_at,
        lastError: row.last_error,
        updatedAt: row.updated_at,
    };
};

export const getSessionEngineConfigBySessionId = async (sessionId) => {
    const result = await runQuery(
        `SELECT session_id, user_id, status, engine_type, engine_config, health_status, last_heartbeat_at, last_error, updated_at
         FROM whatsapp_sessions
         WHERE session_id = $1`,
        [sessionId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        sessionId: row.session_id,
        userId: row.user_id,
        status: row.status,
        engineType: row.engine_type || 'baileys',
        engineConfig: row.engine_config || {},
        healthStatus: row.health_status || 'unknown',
        lastHeartbeatAt: row.last_heartbeat_at,
        lastError: row.last_error,
        updatedAt: row.updated_at,
    };
};

export const setSessionEngineConfig = async ({ sessionId, userId, engineType, engineConfig }) => {
    if (!isAllowedEngine(engineType)) {
        throw new Error(`Unsupported engine_type '${engineType}'. Allowed: ${ALLOWED_ENGINES.join(', ')}`);
    }

    if (!isEngineEnabled(engineType)) {
        throw new Error(`Engine '${engineType}' is currently disabled by rollout policy`);
    }

    const previous = await runQuery(
        `SELECT engine_type, status
         FROM whatsapp_sessions
         WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId]
    );

    if (previous.rows.length === 0) {
        return null;
    }

    const previousEngine = previous.rows[0].engine_type || 'baileys';
    const currentStatus = previous.rows[0].status || 'DISCONNECTED';

    // Prevent engine switching while a session is active to avoid auth/state corruption.
    if (previousEngine !== engineType && currentStatus === 'CONNECTED') {
        throw new Error('Engine switch requires DISCONNECTED session state');
    }

    const result = await runQuery(
        `UPDATE whatsapp_sessions
         SET engine_type = $1,
             engine_config = $2::jsonb,
             updated_at = NOW()
         WHERE session_id = $3 AND user_id = $4
         RETURNING session_id, user_id, status, engine_type, engine_config, health_status, last_heartbeat_at, last_error, updated_at`,
        [engineType, JSON.stringify(engineConfig || {}), sessionId, userId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    await runQuery(
        `INSERT INTO session_engine_events (session_id, user_id, old_engine_type, new_engine_type, reason, created_at)
         VALUES ($1, $2, NULL, $3, $4, NOW())`,
        [sessionId, userId, previousEngine, engineType, 'manual_update']
    ).catch(() => {
        // Table might not exist yet in some environments; do not fail config update.
    });

    const row = result.rows[0];
    return {
        sessionId: row.session_id,
        userId: row.user_id,
        status: row.status,
        engineType: row.engine_type || 'baileys',
        engineConfig: row.engine_config || {},
        healthStatus: row.health_status || 'unknown',
        lastHeartbeatAt: row.last_heartbeat_at,
        lastError: row.last_error,
        updatedAt: row.updated_at,
    };
};

export const updateSessionEngineHealth = async ({ sessionId, healthStatus, lastError = null }) => {
    const result = await runQuery(
        `UPDATE whatsapp_sessions
         SET health_status = $1,
             last_heartbeat_at = NOW(),
             last_error = $2,
             updated_at = NOW()
         WHERE session_id = $3
         RETURNING session_id, engine_type, health_status, last_heartbeat_at, last_error`,
        [healthStatus, lastError, sessionId]
    );

    return result.rows[0] || null;
};

export const recordSessionEngineMetric = async ({
    sessionId,
    engineType,
    latencyMs,
    errorRate,
    uptimePercent,
    activeConnections,
}) => {
    await runQuery(
        `INSERT INTO session_engine_health_metrics (
            session_id,
            engine_type,
            latency_ms,
            error_rate,
            uptime_percent,
            active_connections,
            sampled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
            sessionId,
            engineType,
            latencyMs ?? null,
            errorRate ?? null,
            uptimePercent ?? null,
            activeConnections ?? null,
        ]
    );
};

export const getSessionEngineMetrics = async (sessionId, limit = 20) => {
    const result = await runQuery(
        `SELECT session_id, engine_type, latency_ms, error_rate, uptime_percent, active_connections, sampled_at
         FROM session_engine_health_metrics
         WHERE session_id = $1
         ORDER BY sampled_at DESC
         LIMIT $2`,
        [sessionId, Math.max(1, Math.min(limit, 200))]
    );

    return result.rows;
};
