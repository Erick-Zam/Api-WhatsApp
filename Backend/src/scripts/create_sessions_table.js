import { query } from '../db.js';

const run = async () => {
    try {
        console.log('Checking/Creating whatsapp_sessions table...');

        await query(`
            CREATE TABLE IF NOT EXISTS whatsapp_sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                api_key VARCHAR(255),
                user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
                session_name VARCHAR(255),
                status VARCHAR(50) DEFAULT 'DISCONNECTED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('whatsapp_sessions table ensure exists.');

        // Verify
        const res = await query("SELECT to_regclass('public.whatsapp_sessions');");
        console.log('Table exists check:', res.rows[0]);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
};

run();
