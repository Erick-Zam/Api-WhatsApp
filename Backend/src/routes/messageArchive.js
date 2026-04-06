import express from 'express';
import { getMessagesForChat, getSessionStats, searchMessages, getMessageCount } from '../services/messageArchive.js';

const router = express.Router();

/**
 * Get messages for a specific chat with pagination
 * GET /api/message-archive/:sessionId/:jid?limit=50&offset=0&beforeTimestamp=xxx
 */
router.get('/:sessionId/:jid', async (req, res) => {
    try {
        const { sessionId, jid } = req.params;
        const { limit = 50, offset = 0, beforeTimestamp } = req.query;

        const result = await getMessagesForChat(sessionId, decodeURIComponent(jid), {
            limit: Math.min(Math.max(1, parseInt(limit) || 50), 500),
            offset: Math.max(0, parseInt(offset) || 0),
            beforeTimestamp: beforeTimestamp ? parseInt(beforeTimestamp) : null,
        });

        return res.json({
            sessionId,
            jid: decodeURIComponent(jid),
            messages: result.messages,
            count: result.count,
            hasMore: result.hasMore,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get session statistics
 * GET /api/message-archive/:sessionId/stats
 */
router.get('/:sessionId/stats', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const stats = await getSessionStats(sessionId);

        if (!stats) {
            return res.status(404).json({ error: 'No messages found for session' });
        }

        return res.json({
            sessionId,
            stats: {
                totalMessages: parseInt(stats.total_messages) || 0,
                totalChats: parseInt(stats.total_chats) || 0,
                sentMessages: parseInt(stats.sent_messages) || 0,
                receivedMessages: parseInt(stats.received_messages) || 0,
                oldestMessageTs: stats.oldest_message_ts,
                newestMessageTs: stats.newest_message_ts,
            },
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Search messages in a chat
 * GET /api/message-archive/:sessionId/:jid/search?q=term&limit=50&offset=0
 */
router.get('/:sessionId/:jid/search', async (req, res) => {
    try {
        const { sessionId, jid } = req.params;
        const { q, limit = 50, offset = 0 } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ error: 'Search query required (q parameter)' });
        }

        const result = await searchMessages(sessionId, decodeURIComponent(jid), q, {
            limit: Math.min(Math.max(1, parseInt(limit) || 50), 500),
            offset: Math.max(0, parseInt(offset) || 0),
        });

        return res.json({
            sessionId,
            jid: decodeURIComponent(jid),
            query: q,
            messages: result.messages,
            count: result.count,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get message count for a chat
 * GET /api/message-archive/:sessionId/:jid/count
 */
router.get('/:sessionId/:jid/count', async (req, res) => {
    try {
        const { sessionId, jid } = req.params;
        const count = await getMessageCount(sessionId, decodeURIComponent(jid));

        return res.json({
            sessionId,
            jid: decodeURIComponent(jid),
            messageCount: count,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
