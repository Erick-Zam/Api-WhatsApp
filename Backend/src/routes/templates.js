import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    createTemplate,
    listTemplates,
    deleteTemplate,
    sendTemplateMessage
} from '../services/templates.js';

const router = express.Router();

// List all templates
router.get('/', authenticate, async (req, res) => {
    try {
        const templates = await listTemplates();
        res.json(templates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create/Update a template
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, content, category } = req.body;
        if (!name || !content) {
            return res.status(400).json({ error: 'Name and content are required' });
        }
        const template = await createTemplate(name, content, category);
        res.json({ message: 'Template saved', template });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete a template
router.delete('/:name', authenticate, async (req, res) => {
    try {
        await deleteTemplate(req.params.name);
        res.json({ message: 'Template deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Send a message using a template
router.post('/send', authenticate, async (req, res) => {
    try {
        const { sessionId, phone, template, data } = req.body;
        // sessionId: ID of the sender session
        // phone: Recipient number
        // template: Name of the template (e.g., 'otp_code')
        // data: Object with variables (e.g., { code: '123456' })

        if (!sessionId || !phone || !template) {
            return res.status(400).json({ error: 'Missing required fields: sessionId, phone, template' });
        }

        const result = await sendTemplateMessage(sessionId, phone, template, data);
        res.json({ message: 'Template message sent', result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
