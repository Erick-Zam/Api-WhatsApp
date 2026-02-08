import pool from '../db.js';

const migrate = async () => {
    console.log('Starting migration...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_sessions (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                api_key VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES api_users(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Migration Complete: whatsapp_sessions table created.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
};

migrate();
