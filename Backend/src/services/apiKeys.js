import { randomBytes } from 'crypto';
import * as db from '../db.js';

export const generateApiKey = () => {
    return 'key_' + randomBytes(16).toString('hex');
};

export const getSessionKey = async (sessionId) => {
    try {
        const result = await db.query('SELECT api_key FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
        if (result.rows.length > 0) {
            return result.rows[0].api_key;
        }
    } catch (e) {
        console.error('Error fetching session key:', e);
    }
    return null;
};

export const createSessionKey = async (sessionId, userId = null) => {
    const existingKey = await getSessionKey(sessionId);
    if (existingKey) return existingKey;

    const newKey = generateApiKey();

    await db.query(
        `INSERT INTO whatsapp_sessions (session_id, api_key, user_id, session_name, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, 'DISCONNECTED', NOW(), NOW()) 
         ON CONFLICT (session_id) 
         DO UPDATE SET api_key = EXCLUDED.api_key WHERE whatsapp_sessions.api_key IS NULL`,
        [sessionId, newKey, userId, sessionId]
    );

    return newKey;
};

export const deleteSessionKey = async (sessionId) => {
    try {
        await db.query('DELETE FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
        console.log(`Deleted API Key for session: ${sessionId}`);
        return true;
    } catch (e) {
        console.error(`Error deleting session key for ${sessionId}:`, e);
        return false;
    }
};

export const listAllSessionKeys = async () => {
    try {
        const result = await db.query('SELECT session_id, api_key, created_at FROM whatsapp_sessions WHERE session_id IS NOT NULL');
        return result.rows;
    } catch (e) {
        console.error('Error listing session keys:', e);
        return [];
    }
};
