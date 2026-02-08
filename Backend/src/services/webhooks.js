import axios from 'axios';
import * as db from '../db.js';

/**
 * Triggers webhooks for a specific session and event.
 * @param {string} sessionId - The session ID.
 * @param {string} event - The event name (e.g., 'messages.upsert').
 * @param {object} payload - The data to send.
 */
export const triggerWebhooks = async (sessionId, event, payload) => {
    try {
        // Find webhooks that:
        // 1. Belong to this session (or are global if we supported that, but mainly per session)
        // 2. Have this event in their events array
        // 3. Are enabled
        const query = `
            SELECT url FROM webhooks 
            WHERE session_id = $1 
            AND $2 = ANY(events) 
            AND enabled = TRUE
        `;
        const result = await db.query(query, [sessionId, event]);

        if (result.rows.length === 0) return;

        console.log(`[Webhook] Triggering ${result.rows.length} hooks for ${event} on ${sessionId}`);

        // Send requests in parallel
        const promises = result.rows.map(async (row) => {
            try {
                await axios.post(row.url, {
                    event,
                    sessionId,
                    timestamp: new Date().toISOString(),
                    data: payload
                }, { timeout: 5000 });
                // We could log success here
            } catch (err) {
                console.error(`[Webhook] Failed to send to ${row.url}:`, err.message);
                // We could log failure/retries here
            }
        });

        await Promise.allSettled(promises);

    } catch (e) {
        console.error('[Webhook] Error fetching/processing webhooks:', e);
    }
};

export const createWebhook = async (sessionId, url, events) => {
    const result = await db.query(
        `INSERT INTO webhooks (session_id, url, events) VALUES ($1, $2, $3) RETURNING *`,
        [sessionId, url, events]
    );
    return result.rows[0];
};

export const listWebhooks = async (sessionId) => {
    const result = await db.query('SELECT * FROM webhooks WHERE session_id = $1', [sessionId]);
    return result.rows;
};

export const deleteWebhook = async (id) => {
    await db.query('DELETE FROM webhooks WHERE id = $1', [id]);
};
