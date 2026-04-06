import pool from '../db.js';

const runStep = async (label, sql) => {
    try {
        await pool.query(sql);
        console.log(`[schema] ok: ${label}`);
    } catch (error) {
        console.error(`[schema] failed: ${label} -> ${error.message}`);
    }
};

export const ensureCriticalSchema = async () => {
    await runStep(
        'pgcrypto extension',
        'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
    );

    await runStep(
        'api_users.email_verified',
        `ALTER TABLE api_users
         ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`
    );

    await runStep(
        'trusted_devices table',
        `CREATE TABLE IF NOT EXISTS trusted_devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
            device_fingerprint VARCHAR(255) NOT NULL,
            device_name VARCHAR(255),
            trusted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, device_fingerprint)
        );`
    );
    await runStep(
        'trusted_devices indexes',
        `CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
         CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);`
    );

    await runStep(
        'audit_events table',
        `CREATE TABLE IF NOT EXISTS audit_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            event_type VARCHAR(100) NOT NULL,
            entity_type VARCHAR(100),
            entity_id VARCHAR(255),
            action VARCHAR(50) NOT NULL,
            before_state JSONB,
            after_state JSONB,
            status VARCHAR(20) DEFAULT 'SUCCESS',
            failure_reason TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            request_id VARCHAR(255),
            session_token_hash VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
    );
    await runStep(
        'audit_events indexes',
        `CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
         CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
         CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);`
    );

    await runStep(
        'security_events table',
        `CREATE TABLE IF NOT EXISTS security_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type VARCHAR(100) NOT NULL,
            severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
            email VARCHAR(255),
            ip_address VARCHAR(45),
            user_agent TEXT,
            description TEXT NOT NULL,
            action_taken VARCHAR(100),
            is_resolved BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
    );
    await runStep(
        'security_events indexes',
        `CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
         CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
         CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);`
    );

    await runStep(
        'whatsapp_sessions engine columns',
        `ALTER TABLE whatsapp_sessions
         ADD COLUMN IF NOT EXISTS engine_type VARCHAR(30) NOT NULL DEFAULT 'baileys',
         ADD COLUMN IF NOT EXISTS engine_config JSONB NOT NULL DEFAULT '{}'::jsonb,
         ADD COLUMN IF NOT EXISTS health_status VARCHAR(30) NOT NULL DEFAULT 'unknown',
         ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE,
         ADD COLUMN IF NOT EXISTS last_error TEXT;`
    );

    await runStep(
        'session_engine_events table',
        `CREATE TABLE IF NOT EXISTS session_engine_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id VARCHAR(255) NOT NULL,
            user_id UUID,
            old_engine_type VARCHAR(30),
            new_engine_type VARCHAR(30) NOT NULL,
            reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
    );
    await runStep(
        'session_engine_events indexes',
        `CREATE INDEX IF NOT EXISTS idx_engine_events_session_created
         ON session_engine_events(session_id, created_at DESC);`
    );

    await runStep(
        'session_engine_health_metrics table',
        `CREATE TABLE IF NOT EXISTS session_engine_health_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id VARCHAR(255) NOT NULL,
            engine_type VARCHAR(30) NOT NULL,
            latency_ms INTEGER,
            error_rate NUMERIC(5,2),
            uptime_percent NUMERIC(5,2),
            active_connections INTEGER,
            sampled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
    );
    await runStep(
        'session_engine_health_metrics indexes',
        `CREATE INDEX IF NOT EXISTS idx_engine_health_session_sampled
         ON session_engine_health_metrics(session_id, sampled_at DESC);`
    );
};