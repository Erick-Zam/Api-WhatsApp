import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createWebhook, listWebhooks, deleteWebhook } from '../services/webhooks.js';

const router = express.Router();

// List webhooks for a session
router.get('/', authenticate, async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    try {
        const webhooks = await listWebhooks(sessionId);
        res.json(webhooks);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create a webhook
router.post('/', authenticate, async (req, res) => {
    const { sessionId, url, events } = req.body;
    // events should be an array like ['messages.upsert', 'messages.update']

    if (!sessionId || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'sessionId, url, and events (array) are required' });
    }

    try {
        const webhook = await createWebhook(sessionId, url, events);
        res.json({ message: 'Webhook created', webhook });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a webhook
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await deleteWebhook(req.params.id);
        res.json({ message: 'Webhook deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
