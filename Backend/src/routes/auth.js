import express from 'express';
import { registerUser, loginUser } from '../services/auth.js';
import { logAudit, logError } from '../services/logger.js';

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
