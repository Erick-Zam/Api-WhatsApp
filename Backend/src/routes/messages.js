import express from 'express';
import {
    sendText,
    sendImage,
    sendVideo,
    sendAudio,
    sendDocument,
    sendLocation,
    sendContact,
    sendPoll,
    updatePresence,
    formatJid
} from '../whatsapp.js';

const router = express.Router();

// Helper to validate common fields
const validateCommon = (req, res, next) => {
    if (!req.body.phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    req.jid = formatJid(req.body.phone);
    if (!req.jid) {
        return res.status(400).json({ error: 'Invalid phone format' });
    }
    next();
};

router.use(validateCommon); // Apply to all routes in this file

// --- Text ---
router.post('/text', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message content is required' });

    try {
        await sendText(req.jid, message);
        res.json({ success: true, message: 'Text sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Media ---
router.post('/image', async (req, res) => {
    const { imageUrl, caption } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });

    try {
        await sendImage(req.jid, imageUrl, caption);
        res.json({ success: true, message: 'Image sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/video', async (req, res) => {
    const { videoUrl, caption, gifPlayback } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'Video URL is required' });

    try {
        await sendVideo(req.jid, videoUrl, caption, gifPlayback);
        res.json({ success: true, message: 'Video sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/audio', async (req, res) => {
    const { audioUrl, ptt } = req.body;
    if (!audioUrl) return res.status(400).json({ error: 'Audio URL is required' });

    try {
        await sendAudio(req.jid, audioUrl, ptt);
        res.json({ success: true, message: 'Audio sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/document', async (req, res) => {
    const { docUrl, fileName, mimetype } = req.body;
    if (!docUrl || !fileName || !mimetype) return res.status(400).json({ error: 'Document URL, filename, and mimetype are required' });

    try {
        await sendDocument(req.jid, docUrl, fileName, mimetype);
        res.json({ success: true, message: 'Document sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Location & Contact ---
router.post('/location', async (req, res) => {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Latitude and Longitude are required' });

    try {
        await sendLocation(req.jid, parseFloat(latitude), parseFloat(longitude));
        res.json({ success: true, message: 'Location sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/contact', async (req, res) => {
    const { contactName, contactPhone } = req.body;
    if (!contactName || !contactPhone) return res.status(400).json({ error: 'Contact Name and Phone are required' });

    try {
        await sendContact(req.jid, contactName, contactPhone);
        res.json({ success: true, message: 'Contact sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Interactive (Polls) ---
router.post('/poll', async (req, res) => {
    const { name, values, singleSelect } = req.body;
    if (!name || !values || !Array.isArray(values)) return res.status(400).json({ error: 'Poll name and values (array) are required' });

    try {
        await sendPoll(req.jid, name, values, singleSelect);
        res.json({ success: true, message: 'Poll sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Presence ---
router.post('/presence', async (req, res) => {
    const { type } = req.body; // 'composing', 'recording', 'available', 'unavailable'
    if (!type) return res.status(400).json({ error: 'Presence type is required' });

    try {
        await updatePresence(req.jid, type);
        res.json({ success: true, message: `Presence updated to ${type}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
