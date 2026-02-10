
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

export default router;
