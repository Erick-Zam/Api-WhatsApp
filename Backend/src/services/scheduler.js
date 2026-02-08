import cron from 'node-cron';
import * as db from '../db.js';
import { sendText, sendImage } from '../whatsapp.js';
import { logError } from './logger.js';

// Table schema assumption:
// scheduled_messages (
//   id SERIAL PRIMARY KEY,
//   session_id VARCHAR(255) NOT NULL,
//   phone VARCHAR(20) NOT NULL,
//   message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image'
//   content TEXT, -- Message text or Caption
//   media_url TEXT, -- For images/media
//   scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
//   status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
//   created_at TIMESTAMP DEFAULT NOW()
// );

export const initScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        console.log('Checking for scheduled messages...');
        try {
            // Find pending messages due now or in the past
            const result = await db.query(
                `SELECT * FROM scheduled_messages 
                 WHERE status = 'pending' AND scheduled_at <= NOW()
                 LIMIT 50`
            );

            for (const msg of result.rows) {
                try {
                    console.log(`Sending scheduled message ${msg.id} to ${msg.phone}`);

                    if (msg.message_type === 'text') {
                        await sendText(msg.phone, msg.content, msg.session_id);
                    } else if (msg.message_type === 'image') {
                        await sendImage(msg.phone, msg.media_url, msg.content, msg.session_id);
                    }

                    // Update status to SENT
                    await db.query('UPDATE scheduled_messages SET status = \'sent\' WHERE id = $1', [msg.id]);
                } catch (err) {
                    console.error(`Failed to send scheduled message ${msg.id}:`, err);
                    await db.query('UPDATE scheduled_messages SET status = \'failed\' WHERE id = $1', [msg.id]);
                    logError('Scheduler', `Failed msg ${msg.id}`, err.message, { msg });
                }
            }
        } catch (error) {
            console.error('Scheduler Error:', error);
            logError('Scheduler', 'Main Loop Error', error.message, null);
        }
    });
};

export const scheduleMessage = async (sessionId, phone, type, content, mediaUrl, date) => {
    try {
        const result = await db.query(
            `INSERT INTO scheduled_messages (session_id, phone, message_type, content, media_url, scheduled_at)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [sessionId, phone, type, content, mediaUrl, date]
        );
        return result.rows[0];
    } catch (e) {
        throw new Error('Database error scheduling message: ' + e.message);
    }
};
