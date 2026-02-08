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
        const result = await db.query('SELECT id, username, email, api_key, role, created_at FROM api_users WHERE id = $1', [id]);

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

export default router;
