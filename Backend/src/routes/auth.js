import express from 'express';
import { registerUser, loginUser } from '../services/auth.js';
import { logAudit, logError } from '../services/logger.js';
import { verifyJwt } from '../middleware/jwtAuth.js';
import * as db from '../db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        const user = await registerUser(email, password, username);

        logAudit(user.id, 'REGISTER', { email }, req.ip);
        res.status(201).json({ message: 'User created', user });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(400).json({ error: error.message });
    }
});



router.get('/me', verifyJwt, async (req, res) => {
    try {
        const { id } = req.user;
        const result = await db.query(`
            SELECT u.id, u.username, u.email, u.api_key, r.name as role, u.created_at 
            FROM api_users u 
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await loginUser(email, password);

        logAudit(result.user.id, 'LOGIN', { email }, req.ip);
        res.json(result);
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(401).json({ error: error.message });
    }
});

router.put('/change-password', verifyJwt, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { id } = req.user;

        // Verify current password logic (needs bcrypt import if doing it here, or use service)
        // For simplicity, let's call a service function or do it here.
        // Let's import bcrypt here as it's not imported at top.
        const bcrypt = await import('bcryptjs');
        const db = await import('../db.js');

        const userResult = await db.default.query('SELECT password_hash FROM api_users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.default.compare(currentPassword, userResult.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: 'Incorrect current password' });

        const hashed = await bcrypt.default.hash(newPassword, 10);
        await db.default.query('UPDATE api_users SET password_hash = $1 WHERE id = $2', [hashed, id]);

        logAudit(id, 'PASSWORD_CHANGE', {}, req.ip);
        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/logs', verifyJwt, async (req, res) => {
    try {
        const { id } = req.user;
        const limit = Number.parseInt(req.query.limit) || 50;
        const offset = Number.parseInt(req.query.offset) || 0;

        const result = await db.query(`
            SELECT * FROM api_usage_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `, [id, limit, offset]);

        res.json(result.rows);
    } catch (error) {
        logError('Auth', error.message, error.stack, req.query);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/profile', verifyJwt, async (req, res) => {
    try {
        const { username, email } = req.body;
        const { id } = req.user;

        if (!username || !email) {
            return res.status(400).json({ error: 'Username and Email are required' });
        }

        await db.query('UPDATE api_users SET username = $1, email = $2 WHERE id = $3', [username, email, id]);

        logAudit(id, 'PROFILE_UPDATE', { username, email }, req.ip);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
