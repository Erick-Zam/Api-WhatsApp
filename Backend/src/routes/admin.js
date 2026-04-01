
import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { verifyJwt } from '../middleware/jwtAuth.js';
import { authorizeAdminAccess, authorizeAnyPermission, authorizePermission } from '../middleware/permissions.js';
import { adminSensitiveActionLimiter } from '../middleware/adminRateLimit.js';

const router = express.Router();
const QUERY_ERROR_TABLE_MISSING = '42P01';
const QUERY_ERROR_COLUMN_MISSING = '42703';

// Protect all admin routes
router.use(verifyJwt);
router.use(authorizeAdminAccess());

const parsePagination = (req) => {
    const limit = Number.parseInt(req.query.limit, 10);
    const offset = Number.parseInt(req.query.offset, 10);

    return {
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
        offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
    };
};

const isSchemaMissing = (error) => error?.code === QUERY_ERROR_TABLE_MISSING || error?.code === QUERY_ERROR_COLUMN_MISSING;

const writeAdminAction = async ({ adminId, action, targetUserId = null, details = {}, reason = null, ipAddress }) => {
    try {
        await query(
            `INSERT INTO admin_actions_log (admin_id, action, target_user_id, reason, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [adminId, action, targetUserId, reason, details, ipAddress]
        );
    } catch (error) {
        if (!isSchemaMissing(error)) {
            throw error;
        }
        await query(
            'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
            [adminId, action, details, ipAddress]
        );
    }
};

const validateRoleName = (roleName) => {
    if (typeof roleName !== 'string') {
        return false;
    }
    return /^[a-z_]{3,40}$/i.test(roleName.trim());
};

/**
 * GET /stats
 * Returns general statistics for the dashboard.
 */
router.get('/stats', authorizeAnyPermission(['audit:view_events', 'admin:view_stats']), async (req, res) => {
    try {
        // Parallel queries for efficiency
        const [
            userCount,
            totalRequests,
            errorCount,
            recentLogs
        ] = await Promise.all([
            query('SELECT COUNT(*) FROM api_users'),
            query('SELECT COUNT(*) FROM api_usage_logs'),
            query('SELECT COUNT(*) FROM api_usage_logs WHERE status_code >= 400'),
            query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5')
        ]);

        res.json({
            users: parseInt(userCount.rows[0].count),
            totalRequests: parseInt(totalRequests.rows[0].count),
            errors: parseInt(errorCount.rows[0].count),
            recentActivity: recentLogs.rows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /logs/usage
 * Returns paginated API usage logs.
 */
router.get('/logs/usage', authorizeAnyPermission(['audit:view_events', 'audit:view_usage']), async (req, res) => {
    const { limit, offset } = parsePagination(req);

    try {
        const logs = await query(
            'SELECT * FROM api_usage_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        res.json(logs.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /logs/activity
 * Returns paginated activity logs.
 */
router.get('/logs/activity', authorizeAnyPermission(['audit:view_events', 'audit:view_activity']), async (req, res) => {
    const { limit, offset } = parsePagination(req);

    try {
        const logs = await query(
            'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        res.json(logs.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /users
 * List all users.
 */
router.get('/users', authorizePermission('users:list'), async (req, res) => {
    try {
        try {
            const users = await query(`
                SELECT u.id, u.username, u.email, u.created_at, u.is_active, r.name as role
                FROM api_users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.created_at DESC
            `);
            return res.json(users.rows);
        } catch (error) {
            if (!isSchemaMissing(error)) {
                throw error;
            }
            const usersLegacy = await query(`
                SELECT u.id, u.username, u.email, u.created_at, r.name as role
                FROM api_users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.created_at DESC
            `);
            return res.json(usersLegacy.rows.map((row) => ({ ...row, is_active: true })));
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * PUT /users/:id/role
 * Change a user's role.
 */
router.put('/users/:id/role', adminSensitiveActionLimiter, authorizePermission('users:manage_roles'), async (req, res) => {
    const { id } = req.params;
    const { roleName, reason = null } = req.body; // e.g., 'admin' or 'general'

    if (!validateRoleName(roleName)) {
        return res.status(400).json({ error: 'Invalid role name format' });
    }

    try {
        const userRes = await query('SELECT role_id FROM api_users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get role ID
        const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', [roleName.trim()]);
        if (roleRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid role name' });
        }
        const roleId = roleRes.rows[0].id;

        await query('UPDATE api_users SET role_id = $1 WHERE id = $2', [roleId, id]);

        try {
            await query(
                `INSERT INTO user_role_changes (user_id, old_role_id, new_role_id, changed_by_admin_id, reason, approved)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, userRes.rows[0].role_id, roleId, req.user.id, reason, true]
            );
        } catch (error) {
            if (!isSchemaMissing(error)) {
                throw error;
            }
        }

        await writeAdminAction({
            adminId: req.user.id,
            action: 'CHANGE_ROLE',
            targetUserId: id,
            reason,
            details: { targetUser: id, newRole: roleName, oldRoleId: userRes.rows[0].role_id },
            ipAddress: req.ip,
        });

        res.json({ message: 'User role updated successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /engine-health
 * Returns per-engine health and connection summary for admin operations.
 */
router.get('/engine-health', authorizeAnyPermission(['engine:view_health', 'admin:view_engine']), async (_req, res) => {
    try {
        const [summaryRes, totalsRes, latencyRes] = await Promise.all([
            query(`
                SELECT
                    engine_type,
                    COALESCE(health_status, 'unknown') AS health_status,
                    COUNT(*)::int AS count
                FROM whatsapp_sessions
                GROUP BY engine_type, COALESCE(health_status, 'unknown')
                ORDER BY engine_type, health_status
            `),
            query(`
                SELECT
                    COALESCE(engine_type, 'baileys') AS engine_type,
                    COUNT(*)::int AS total_sessions,
                    COUNT(*) FILTER (WHERE status = 'CONNECTED')::int AS connected_sessions
                FROM whatsapp_sessions
                GROUP BY COALESCE(engine_type, 'baileys')
                ORDER BY engine_type
            `),
            query(`
                SELECT
                    engine_type,
                    ROUND(AVG(latency_ms)::numeric, 2) AS avg_latency_ms,
                    ROUND(AVG(error_rate)::numeric, 4) AS avg_error_rate,
                    ROUND(AVG(uptime_percent)::numeric, 2) AS avg_uptime_percent
                FROM session_engine_health_metrics
                WHERE sampled_at > NOW() - INTERVAL '30 minutes'
                GROUP BY engine_type
                ORDER BY engine_type
            `),
        ]);

        return res.json({
            totals: totalsRes.rows,
            healthBreakdown: summaryRes.rows,
            recentMetrics: latencyRes.rows,
        });
    } catch (e) {
        // Backward compatibility when engine columns/tables are not migrated yet.
        if (e?.code === '42703' || e?.code === '42P01') {
            return res.json({
                totals: [{ engine_type: 'baileys', total_sessions: 0, connected_sessions: 0 }],
                healthBreakdown: [{ engine_type: 'baileys', health_status: 'unknown', count: 0 }],
                recentMetrics: [],
                warning: 'Engine health schema not fully available yet',
            });
        }
        return res.status(500).json({ error: e.message });
    }
});

/**
 * GET /audit/events
 * Returns paginated audit events for compliance operations.
 */
router.get('/audit/events', authorizePermission('audit:view_events'), async (req, res) => {
    const { limit, offset } = parsePagination(req);

    try {
        const events = await query(
            `SELECT id, user_id, event_type, entity_type, entity_id, action, status, failure_reason, ip_address, timestamp
             FROM audit_events
             ORDER BY timestamp DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return res.json(events.rows);
    } catch (error) {
        if (isSchemaMissing(error)) {
            return res.status(501).json({ error: 'Audit events schema not available yet' });
        }
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /audit/security
 * Returns security incidents for admin monitoring.
 */
router.get('/audit/security', authorizePermission('audit:view_security'), async (req, res) => {
    const { limit, offset } = parsePagination(req);

    try {
        const incidents = await query(
            `SELECT id, event_type, severity, email, ip_address, description, action_taken, is_resolved, timestamp
             FROM security_events
             ORDER BY timestamp DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return res.json(incidents.rows);
    } catch (error) {
        if (isSchemaMissing(error)) {
            return res.status(501).json({ error: 'Security events schema not available yet' });
        }
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /users/:id/lock
 * Deactivates a user account.
 */
router.post('/users/:id/lock', adminSensitiveActionLimiter, authorizePermission('users:lock'), async (req, res) => {
    const { id } = req.params;
    const { reason = null } = req.body || {};

    try {
        const updated = await query('UPDATE api_users SET is_active = false WHERE id = $1 RETURNING id', [id]);
        if (updated.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await writeAdminAction({
            adminId: req.user.id,
            action: 'LOCK_USER',
            targetUserId: id,
            reason,
            details: { isActive: false },
            ipAddress: req.ip,
        });

        return res.json({ message: 'User locked successfully' });
    } catch (error) {
        if (isSchemaMissing(error)) {
            return res.status(501).json({ error: 'User lock schema not available yet' });
        }
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /users/:id/unlock
 * Reactivates a user account.
 */
router.post('/users/:id/unlock', adminSensitiveActionLimiter, authorizePermission('users:lock'), async (req, res) => {
    const { id } = req.params;
    const { reason = null } = req.body || {};

    try {
        const updated = await query('UPDATE api_users SET is_active = true WHERE id = $1 RETURNING id', [id]);
        if (updated.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await writeAdminAction({
            adminId: req.user.id,
            action: 'UNLOCK_USER',
            targetUserId: id,
            reason,
            details: { isActive: true },
            ipAddress: req.ip,
        });

        return res.json({ message: 'User unlocked successfully' });
    } catch (error) {
        if (isSchemaMissing(error)) {
            return res.status(501).json({ error: 'User lock schema not available yet' });
        }
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /users/:id/api-key/rotate
 * Rotates the user API key with audit trail.
 */
router.post('/users/:id/api-key/rotate', adminSensitiveActionLimiter, authorizePermission('admin:revoke_api_keys'), async (req, res) => {
    const { id } = req.params;
    const { reason = 'admin_rotation' } = req.body || {};

    try {
        const userRes = await query('SELECT api_key FROM api_users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const oldApiKey = userRes.rows[0].api_key;
        const newApiKey = `key_${crypto.randomBytes(16).toString('hex')}`;

        await query('UPDATE api_users SET api_key = $1 WHERE id = $2', [newApiKey, id]);

        try {
            await query(
                `INSERT INTO api_key_rotation_log (user_id, old_api_key_hash, new_api_key_hash, reason, rotated_by_admin_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    id,
                    crypto.createHash('sha256').update(oldApiKey).digest('hex'),
                    crypto.createHash('sha256').update(newApiKey).digest('hex'),
                    reason,
                    req.user.id,
                ]
            );
        } catch (error) {
            if (!isSchemaMissing(error)) {
                throw error;
            }
        }

        await writeAdminAction({
            adminId: req.user.id,
            action: 'ROTATE_API_KEY',
            targetUserId: id,
            reason,
            details: { rotated: true },
            ipAddress: req.ip,
        });

        return res.json({ message: 'API key rotated successfully', apiKey: newApiKey });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
