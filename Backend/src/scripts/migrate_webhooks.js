import pool from '../db.js';

const migrate = async () => {
    console.log('Starting migration for webhooks...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS webhooks (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                url TEXT NOT NULL,
                events TEXT[], -- e.g. ['messages.upsert', 'messages.update']
                enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Migration Complete: webhooks table created.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
};

migrate();
