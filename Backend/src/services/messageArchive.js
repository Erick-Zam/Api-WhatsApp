import * as db from '../db.js';

/**
 * Message Archive Service - Handles persistent message storage to PostgreSQL
 * Phase 5b: Message Persistence
 *
 * Replaces RAM-only storage to survive process restarts
 * Queries are optimized with pagination for large chat histories
 */

const ARCHIVE_RETENTION_DAYS = 90;
const BATCH_SIZE = 100;

/**
 * Initialize message archive tables (run on startup)
 */
export const initializeMessageArchive = async () => {
    try {
        // Check if table exists
        const result = await db.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'message_archive'
            );`
        );

        if (!result.rows[0].exists) {
            console.log('[MessageArchive] Table not found, creating...');
            // Create table if it doesn't exist
            await db.query(`
                CREATE TABLE IF NOT EXISTS message_archive (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL,
                    remote_jid VARCHAR(255) NOT NULL,
                    message_key_id VARCHAR(255) NOT NULL UNIQUE,
                    from_me BOOLEAN NOT NULL DEFAULT false,
                    message_type VARCHAR(50),
                    text_content TEXT,
                    media_type VARCHAR(50),
                    media_url TEXT,
                    caption TEXT,
                    raw_message_json JSONB NOT NULL,
                    message_timestamp BIGINT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Create indexes
            const indexes = [
                `CREATE INDEX IF NOT EXISTS idx_message_archive_session_id ON message_archive(session_id);`,
                `CREATE INDEX IF NOT EXISTS idx_message_archive_remote_jid ON message_archive(remote_jid);`,
                `CREATE INDEX IF NOT EXISTS idx_message_archive_session_jid ON message_archive(session_id, remote_jid);`,
                `CREATE INDEX IF NOT EXISTS idx_message_archive_timestamp ON message_archive(message_timestamp DESC);`,
                `CREATE INDEX IF NOT EXISTS idx_message_archive_created ON message_archive(created_at DESC);`,
            ];

            for (const idx of indexes) {
                await db.query(idx);
            }

            console.log('[MessageArchive] Table and indexes created');
        } else {
            console.log('[MessageArchive] Table already exists');
        }
    } catch (error) {
        console.error('[MessageArchive] Initialization error:', error.message);
    }
};

/**
 * Save a single message to archive
 */
export const saveMessage = async (sessionId, message) => {
    try {
        if (!message || !message.key) {
            console.warn('[MessageArchive] Invalid message format');
            return null;
        }

        const key = message.key;
        const msg = message.message || {};
        const messageType = Object.keys(msg)[0] || 'unknown';
        
        // Extract text content
        let textContent = null;
        if (msg.conversation) {
            textContent = msg.conversation;
        } else if (msg.extendedTextMessage?.text) {
            textContent = msg.extendedTextMessage.text;
        }

        // Extract media type
        let mediaType = null;
        let mediaUrl = null;
        let caption = null;
        if (msg.imageMessage) {
            mediaType = 'image';
            caption = msg.imageMessage.caption;
        } else if (msg.videoMessage) {
            mediaType = 'video';
            caption = msg.videoMessage.caption;
        } else if (msg.audioMessage) {
            mediaType = 'audio';
        } else if (msg.documentMessage) {
            mediaType = 'document';
            mediaUrl = msg.documentMessage.url;
        }

        const result = await db.query(
            `INSERT INTO message_archive (
                session_id, remote_jid, message_key_id, from_me,
                message_type, text_content, media_type, media_url, caption,
                raw_message_json, message_timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (message_key_id) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;`,
            [
                sessionId,
                key.remoteJid,
                key.id,
                key.fromMe || false,
                messageType,
                textContent,
                mediaType,
                mediaUrl,
                caption,
                JSON.stringify(message),
                message.messageTimestamp || Math.floor(Date.now() / 1000),
            ]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[MessageArchive] Save error:', error.message);
        return null;
    }
};

/**
 * Save multiple messages in batch
 */
export const saveMessages = async (sessionId, messages) => {
    try {
        let saved = 0;
        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            const batch = messages.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(msg => saveMessage(sessionId, msg))
            );
            saved += batch.length;
        }
        console.log(`[MessageArchive] Saved ${saved} messages for session '${sessionId}'`);
        return saved;
    } catch (error) {
        console.error('[MessageArchive] Batch save error:', error.message);
        return 0;
    }
};

/**
 * Get messages for a chat (with pagination)
 */
export const getMessagesForChat = async (sessionId, remoteJid, options = {}) => {
    try {
        const { limit = 50, offset = 0, beforeTimestamp = null } = options;
        const maxLimit = Math.min(limit, 500);

        let query = `
            SELECT * FROM message_archive
            WHERE session_id = $1 AND remote_jid = $2
        `;
        const params = [sessionId, remoteJid];

        if (beforeTimestamp) {
            query += ` AND message_timestamp < $${params.length + 1}`;
            params.push(beforeTimestamp);
        }

        query += ` ORDER BY message_timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(maxLimit, offset);

        const result = await db.query(query, params);
        
        return {
            messages: result.rows.reverse(), // Reverse to get chronological order
            count: result.rows.length,
            hasMore: result.rows.length === maxLimit,
        };
    } catch (error) {
        console.error('[MessageArchive] Get messages error:', error.message);
        return { messages: [], count: 0, hasMore: false };
    }
};

/**
 * Get all messages for a session (for restoration after restart)
 */
export const getSessionMessages = async (sessionId) => {
    try {
        const result = await db.query(
            `SELECT raw_message_json FROM message_archive
             WHERE session_id = $1
             ORDER BY message_timestamp ASC;`,
            [sessionId]
        );

        return result.rows.map(row => {
            try {
                return typeof row.raw_message_json === 'string' 
                    ? JSON.parse(row.raw_message_json) 
                    : row.raw_message_json;
            } catch {
                return null;
            }
        }).filter(m => m !== null);
    } catch (error) {
        console.error('[MessageArchive] Get session messages error:', error.message);
        return [];
    }
};

/**
 * Get session statistics
 */
export const getSessionStats = async (sessionId) => {
    try {
        const result = await db.query(
            `SELECT 
                COUNT(*) as total_messages,
                COUNT(DISTINCT remote_jid) as total_chats,
                COUNT(CASE WHEN from_me THEN 1 END) as sent_messages,
                COUNT(CASE WHEN NOT from_me THEN 1 END) as received_messages,
                MIN(message_timestamp) as oldest_message_ts,
                MAX(message_timestamp) as newest_message_ts
             FROM message_archive
             WHERE session_id = $1;`,
            [sessionId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[MessageArchive] Stats error:', error.message);
        return null;
    }
};

/**
 * Delete messages older than retention period
 */
export const cleanupOldMessages = async () => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_RETENTION_DAYS);
        const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

        const result = await db.query(
            `DELETE FROM message_archive
             WHERE message_timestamp < $1 OR created_at < $2
             RETURNING id;`,
            [cutoffTimestamp, cutoffDate]
        );

        console.log(`[MessageArchive] Cleaned up ${result.rows.length} messages older than ${ARCHIVE_RETENTION_DAYS} days`);
        return result.rows.length;
    } catch (error) {
        console.error('[MessageArchive] Cleanup error:', error.message);
        return 0;
    }
};

/**
 * Schedule periodic cleanup (runs daily)
 */
export const scheduleCleanup = () => {
    // Run cleanup every 24 hours
    const cleanupInterval = setInterval(async () => {
        await cleanupOldMessages();
    }, 24 * 60 * 60 * 1000);

    console.log('[MessageArchive] Scheduled daily cleanup for messages older than 90 days');
    return cleanupInterval;
};

/**
 * Get message count for a chat
 */
export const getMessageCount = async (sessionId, remoteJid) => {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as count FROM message_archive
             WHERE session_id = $1 AND remote_jid = $2;`,
            [sessionId, remoteJid]
        );

        return result.rows[0].count;
    } catch (error) {
        console.error('[MessageArchive] Count error:', error.message);
        return 0;
    }
};

/**
 * Search messages in a chat
 */
export const searchMessages = async (sessionId, remoteJid, searchTerm, options = {}) => {
    try {
        const { limit = 50, offset = 0 } = options;
        const maxLimit = Math.min(limit, 500);
        
        const result = await db.query(
            `SELECT * FROM message_archive
             WHERE session_id = $1 AND remote_jid = $2
             AND (text_content ILIKE $3 OR caption ILIKE $3)
             ORDER BY message_timestamp DESC
             LIMIT $4 OFFSET $5;`,
            [sessionId, remoteJid, `%${searchTerm}%`, maxLimit, offset]
        );

        return {
            messages: result.rows.reverse(),
            count: result.rows.length,
        };
    } catch (error) {
        console.error('[MessageArchive] Search error:', error.message);
        return { messages: [], count: 0 };
    }
};
