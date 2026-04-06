/**
 * Migration: Create message_archive table for persistent message storage
 * Phase 5b: Message Persistence
 *
 * Purpose: Store all WhatsApp messages in PostgreSQL to survive process restarts
 * Replaces: RAM-only storage in simpleStore.js
 * Schedule: Weekly cleanup of messages older than 90 days
 */

export const up = async (connection) => {
    try {
        // Create message_archive table
        await connection.query(`
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

        // Create indexes for fast queries
        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_message_archive_session_id 
            ON message_archive(session_id);
        `);

        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_message_archive_remote_jid 
            ON message_archive(remote_jid);
        `);

        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_message_archive_session_jid 
            ON message_archive(session_id, remote_jid);
        `);

        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_message_archive_timestamp 
            ON message_archive(message_timestamp DESC);
        `);

        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_message_archive_created 
            ON message_archive(created_at DESC);
        `);

        console.log('✓ message_archive table created with indexes');

    } catch (error) {
        if (!error.message.includes('already exists')) {
            throw error;
        }
        console.log('✓ message_archive table already exists');
    }
};

export const down = async (connection) => {
    try {
        await connection.query('DROP TABLE IF EXISTS message_archive CASCADE;');
        console.log('✓ message_archive table dropped');
    } catch (error) {
        console.error('Error dropping message_archive table:', error.message);
    }
};
