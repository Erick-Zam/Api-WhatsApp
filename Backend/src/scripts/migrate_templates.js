import pool from '../db.js';

const migrate = async () => {
    console.log('Starting migration for templates...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS message_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'otp_verification', 'welcome_msg'
                content TEXT NOT NULL, -- e.g. 'Hello {{name}}, your code is {{code}}'
                category VARCHAR(50) DEFAULT 'general',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Migration Complete: message_templates table created.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
};

migrate();
