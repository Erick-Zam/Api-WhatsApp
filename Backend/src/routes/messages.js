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
    sendReaction,
    sendReply,
    formatJid
} from '../whatsapp.js';
import {
    sendAudioMessage,
    sendContactMessage,
    sendDocumentMessage,
    sendImageMessage,
    sendLocationMessage,
    sendPollMessage,
    sendPresenceUpdate,
    sendTextMessage,
    sendVideoMessage,
} from '../services/sessionOrchestrator.js';

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

const resolveSessionId = (req) => req.body.sessionId || req.sessionId || 'default';
const resolveUserId = (req) => req.user?.id || null;

const withLegacyFallback = async (orchestrated, fallback) => {
    try {
        return await orchestrated();
    } catch (error) {
        if (/not implemented/i.test(error.message)) {
            return fallback();
        }
        throw error;
    }
};

// --- Reaction & Reply ---
router.post('/reaction', async (req, res) => {
    const { messageId, emoji, sessionId } = req.body;
    // req.jid is ALREADY set by validateCommon middleware based on phone
    // We need messageId which message to react to.

    if (!messageId || !emoji) return res.status(400).json({ error: 'messageId and emoji are required' });

    try {
        // Construct the key. We assume we are reacting to a message in the chat defined by 'phone'.
        // We don't know if it's fromMe or not without more info, but usually reactions are to others.
        // If the user wants to react to their own message, they need to specify.
        // For simplicity, we assume standard reaction to the other party.
        const key = {
            remoteJid: req.jid,
            fromMe: false, // Default to reacting to received message
            id: messageId
        };

        await sendReaction(req.jid, key, emoji, sessionId);
        res.json({ success: true, message: 'Reaction sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/reply', async (req, res) => {
    const { message, quotedMessage, sessionId } = req.body;
    // quotedMessage should be the full message object received from webhook

    if (!message || !quotedMessage) return res.status(400).json({ error: 'Message and quotedMessage object are required' });

    try {
        await sendReply(req.jid, message, quotedMessage, sessionId);
        res.json({ success: true, message: 'Reply sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Text ---
router.post('/text', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message content is required' });

    try {
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendTextMessage({ sessionId, userId, jid: req.jid, message }),
            () => sendText(req.jid, message, sessionId)
        );
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
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendImageMessage({ sessionId, userId, jid: req.jid, imageUrl, caption }),
            () => sendImage(req.jid, imageUrl, caption, sessionId)
        );
        res.json({ success: true, message: 'Image sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/video', async (req, res) => {
    const { videoUrl, caption, gifPlayback } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'Video URL is required' });

    try {
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendVideoMessage({ sessionId, userId, jid: req.jid, videoUrl, caption, gifPlayback }),
            () => sendVideo(req.jid, videoUrl, caption, gifPlayback, sessionId)
        );
        res.json({ success: true, message: 'Video sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/audio', async (req, res) => {
    const { audioUrl, ptt } = req.body;
    if (!audioUrl) return res.status(400).json({ error: 'Audio URL is required' });

    try {
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendAudioMessage({ sessionId, userId, jid: req.jid, audioUrl, ptt }),
            () => sendAudio(req.jid, audioUrl, ptt, sessionId)
        );
        res.json({ success: true, message: 'Audio sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/document', async (req, res) => {
    const { docUrl, fileName, mimetype } = req.body;
    if (!docUrl || !fileName || !mimetype) return res.status(400).json({ error: 'Document URL, filename, and mimetype are required' });

    try {
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendDocumentMessage({ sessionId, userId, jid: req.jid, docUrl, fileName, mimetype }),
            () => sendDocument(req.jid, docUrl, fileName, mimetype, sessionId)
        );
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
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);
        const lat = parseFloat(latitude);
        const long = parseFloat(longitude);

        await withLegacyFallback(
            () => sendLocationMessage({ sessionId, userId, jid: req.jid, latitude: lat, longitude: long }),
            () => sendLocation(req.jid, lat, long, sessionId)
        );
        res.json({ success: true, message: 'Location sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/contact', async (req, res) => {
    const { contactName, contactPhone } = req.body;
    if (!contactName || !contactPhone) return res.status(400).json({ error: 'Contact Name and Phone are required' });

    try {
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendContactMessage({ sessionId, userId, jid: req.jid, contactName, contactPhone }),
            () => sendContact(req.jid, contactName, contactPhone, sessionId)
        );
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
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendPollMessage({ sessionId, userId, jid: req.jid, name, values, singleSelect }),
            () => sendPoll(req.jid, name, values, singleSelect, sessionId)
        );
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
        const sessionId = resolveSessionId(req);
        const userId = resolveUserId(req);

        await withLegacyFallback(
            () => sendPresenceUpdate({ sessionId, userId, jid: req.jid, type }),
            () => updatePresence(req.jid, type, sessionId)
        );
        res.json({ success: true, message: `Presence updated to ${type}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
