import express from 'express';
import { scheduleMessage } from '../services/scheduler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Schedule a message
router.post('/', authenticate, async (req, res) => {
    try {
        const { sessionId, phone, type, content, mediaUrl, date } = req.body;
        // sessionId might come from body or inferred from something else, 
        // but typically user specifies which session to use if they have multiple.
        // Or if using x-api-key, we might extract session from there (but currently authenticate matches user, not session key).
        // Let's assume user passes sessionId implicitly or explicitly.
        // Actually, for API usage, we might want to prioritize the x-api-key session if present.

        // For now, simple params validation
        if (!sessionId || !phone || !date) {
            return res.status(400).json({ error: 'Missing required fields: sessionId, phone, date' });
        }

        const scheduled = await scheduleMessage(sessionId, phone, type || 'text', content, mediaUrl, date);
        res.json({ message: 'Message scheduled', data: scheduled });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
