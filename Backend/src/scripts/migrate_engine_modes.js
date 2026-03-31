import pool from '../db.js';

const migrateEngineModes = async () => {
    console.log('Starting migration for engine modes...');

    try {
        await pool.query(`
            ALTER TABLE whatsapp_sessions
            ADD COLUMN IF NOT EXISTS engine_type VARCHAR(30) NOT NULL DEFAULT 'baileys',
            ADD COLUMN IF NOT EXISTS engine_config JSONB NOT NULL DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS health_status VARCHAR(30) NOT NULL DEFAULT 'unknown',
            ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS last_error TEXT;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS session_engine_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id VARCHAR(255) NOT NULL,
                user_id UUID,
                old_engine_type VARCHAR(30),
                new_engine_type VARCHAR(30) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_engine_events_session_created
            ON session_engine_events(session_id, created_at DESC);
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS session_engine_health_metrics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id VARCHAR(255) NOT NULL,
                engine_type VARCHAR(30) NOT NULL,
                latency_ms INTEGER,
                error_rate NUMERIC(5,2),
                uptime_percent NUMERIC(5,2),
                active_connections INTEGER,
                sampled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_engine_health_session_sampled
            ON session_engine_health_metrics(session_id, sampled_at DESC);
        `);

        await pool.query(`
            UPDATE whatsapp_sessions
            SET engine_type = 'baileys'
            WHERE engine_type IS NULL OR engine_type = '';
        `);

        console.log('Migration complete: engine mode fields and tables created.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateEngineModes();
