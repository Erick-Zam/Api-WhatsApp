import pool from '../db.js';

const migrate = async () => {
    console.log('Starting migration...');
    try {
        // Scheduled Messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                message_type VARCHAR(20) DEFAULT 'text',
                content TEXT,
                media_url TEXT,
                scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Migration Complete: scheduled_messages table created.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
};

migrate();
