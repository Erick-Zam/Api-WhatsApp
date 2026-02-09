import express from 'express';
import {
    getChats,
    getMessages,
    createGroup,
    getGroupMetadata,
    groupParticipantsUpdate,
    groupUpdateSubject,
    groupUpdateDescription,
    groupInviteCode,
    groupRevokeInvite,
    groupLeave,
    formatJid
} from '../whatsapp.js';

const router = express.Router();

// Middleware to validate session existence (optional, or rely on internal check)
const validateSession = (req, res, next) => {
    // Session is already attached to req by global auth middleware if using API Key
    // If not, we might need to check req.body.sessionId or req.query.sessionId
    if (!req.sessionId) {
        req.sessionId = req.body.sessionId || req.query.sessionId || 'default';
    }
    next();
};

router.use(validateSession);

// --- Chats ---

// Get all chats
router.get('/', async (req, res) => {
    try {
        const chats = await getChats(req.sessionId);
        // Sort by last message timestamp if available, usually handled by frontend or pre-sorted by store?
        // Baileys store returns all chats, order might vary.
        res.json({ success: true, count: chats.length, chats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a specific chat
router.get('/:jid/messages', async (req, res) => {
    const { jid } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Format JID just in case
    const formattedJid = formatJid(jid);

    try {
        const messages = await getMessages(req.sessionId, formattedJid, limit);
        res.json({ success: true, count: messages.length, messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Groups ---

// Create Group
router.post('/groups', async (req, res) => {
    const { subject, participants } = req.body;
    if (!subject || !participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Subject and participants array are required' });
    }

    // Format participant JIDs
    const formattedParticipants = participants.map(p => formatJid(p));

    try {
        const group = await createGroup(req.sessionId, subject, formattedParticipants);
        res.json({ success: true, message: 'Group created', group });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Group Metadata
router.get('/groups/:jid', async (req, res) => {
    const { jid } = req.params;
    const formattedJid = formatJid(jid);

    try {
        const metadata = await getGroupMetadata(req.sessionId, formattedJid);
        res.json({ success: true, metadata });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Group Participants (add, remove, promote, demote)
router.post('/groups/:jid/participants', async (req, res) => {
    const { jid } = req.params;
    const { action, participants } = req.body; // action: 'add' | 'remove' | 'promote' | 'demote'

    if (!action || !['add', 'remove', 'promote', 'demote'].includes(action)) {
        return res.status(400).json({ error: 'Valid action (add, remove, promote, demote) is required' });
    }
    if (!participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Participants array is required' });
    }

    const formattedJid = formatJid(jid);
    const formattedParticipants = participants.map(p => formatJid(p));

    try {
        const result = await groupParticipantsUpdate(req.sessionId, formattedJid, formattedParticipants, action);
        res.json({ success: true, message: `Participants ${action}ed`, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Subject
router.put('/groups/:jid/subject', async (req, res) => {
    const { jid } = req.params;
    const { subject } = req.body;

    if (!subject) return res.status(400).json({ error: 'Subject is required' });

    try {
        await groupUpdateSubject(req.sessionId, formatJid(jid), subject);
        res.json({ success: true, message: 'Subject updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Description
router.put('/groups/:jid/description', async (req, res) => {
    const { jid } = req.params;
    const { description } = req.body;

    if (!description) return res.status(400).json({ error: 'Description is required' });

    try {
        await groupUpdateDescription(req.sessionId, formatJid(jid), description);
        res.json({ success: true, message: 'Description updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Invite Code
router.get('/groups/:jid/invite-code', async (req, res) => {
    const { jid } = req.params;
    try {
        const code = await groupInviteCode(req.sessionId, formatJid(jid));
        res.json({ success: true, code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Revoke Invite Code
router.post('/groups/:jid/revoke-invite', async (req, res) => {
    const { jid } = req.params;
    try {
        const code = await groupRevokeInvite(req.sessionId, formatJid(jid));
        res.json({ success: true, message: 'Invite code revoked', newCode: code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Leave Group
router.post('/groups/:jid/leave', async (req, res) => {
    const { jid } = req.params;
    try {
        await groupLeave(req.sessionId, formatJid(jid));
        res.json({ success: true, message: 'Left group' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
