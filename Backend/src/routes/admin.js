
import express from 'express';
import { query } from '../db.js';
import { verifyJwt } from '../middleware/jwtAuth.js';
import { authorizeRole } from '../middleware/rbac.js';

const router = express.Router();

// Protect all admin routes
router.use(verifyJwt);
router.use(authorizeRole('admin'));

/**
 * GET /stats
 * Returns general statistics for the dashboard.
 */
router.get('/stats', async (req, res) => {
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
router.get('/logs/usage', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

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
router.get('/logs/activity', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

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
// GET /users
// List all users.
router.get('/users', async (req, res) => {
    try {
        const users = await query(`
            SELECT u.id, u.username, u.email, u.created_at, r.name as role 
            FROM api_users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `);
        res.json(users.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * PUT /users/:id/role
 * Change a user's role.
 */
router.put('/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { roleName } = req.body; // e.g., 'admin' or 'general'

    try {
        // Get role ID
        const roleRes = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid role name' });
        }
        const roleId = roleRes.rows[0].id;

        await query('UPDATE api_users SET role_id = $1 WHERE id = $2', [roleId, id]);

        // Log action
        await query(
            'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'CHANGE_ROLE', { targetUser: id, newRole: roleName }, req.ip]
        );

        res.json({ message: 'User role updated successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /engine-health
 * Returns per-engine health and connection summary for admin operations.
 */
router.get('/engine-health', async (_req, res) => {
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

export default router;
