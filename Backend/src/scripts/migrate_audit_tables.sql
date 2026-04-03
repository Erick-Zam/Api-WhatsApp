-- ============================================================
-- MIGRACIÓN: Tablas de Auditoría y Seguridad
-- Ejecutar en el panel de PostgreSQL de Dokploy / psql
-- ============================================================

BEGIN;

-- 1. audit_events (SOC2 core audit log)
CREATE TABLE IF NOT EXISTS audit_events (
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
);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);

-- 2. security_events (suspicious activity, brute force, etc.)
CREATE TABLE IF NOT EXISTS security_events (
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
);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- 3. data_access_logs (GDPR data access tracking)
CREATE TABLE IF NOT EXISTS data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    purpose_code VARCHAR(100),
    ip_address VARCHAR(45),
    duration_ms INTEGER,
    bytes_transferred BIGINT,
    query_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_data_access_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_created_at ON data_access_logs(created_at DESC);

-- 4. data_deletion_logs (GDPR right to be forgotten)
CREATE TABLE IF NOT EXISTS data_deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    deletion_reason VARCHAR(100) DEFAULT 'USER_REQUEST',
    records_count INTEGER NOT NULL DEFAULT 0,
    data_snapshot JSONB,
    deleted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_data_deletion_user_id ON data_deletion_logs(user_id);

-- 5. consent_records (GDPR consent management)
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    consent_type VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    version VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);

-- 6. failed_login_attempts (brute force detection)
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    reason VARCHAR(100) DEFAULT 'INVALID_PASSWORD',
    attempt_number INTEGER NOT NULL DEFAULT 1,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_failed_login_email_ip ON failed_login_attempts(email, ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_created_at ON failed_login_attempts(created_at DESC);

-- 7. api_key_rotation_log
CREATE TABLE IF NOT EXISTS api_key_rotation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_api_key_hash VARCHAR(255),
    new_api_key_hash VARCHAR(255),
    reason VARCHAR(100) DEFAULT 'AUTOMATIC_ROTATION',
    rotated_by_admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_key_rotation_user_id ON api_key_rotation_log(user_id);

-- 8. user_role_changes
CREATE TABLE IF NOT EXISTS user_role_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_role_id INTEGER,
    new_role_id INTEGER NOT NULL,
    changed_by_admin_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. admin_actions_log
CREATE TABLE IF NOT EXISTS admin_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_user_id UUID,
    reason TEXT,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions_log(created_at DESC);

-- 10. compliance_reports_log
CREATE TABLE IF NOT EXISTS compliance_reports_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    generated_by_admin_id UUID,
    report_data JSONB,
    findings_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMIT;

-- Verificar que se crearon correctamente:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'audit_events','security_events','data_access_logs',
    'data_deletion_logs','consent_records','failed_login_attempts',
    'api_key_rotation_log','user_role_changes','admin_actions_log',
    'compliance_reports_log'
)
ORDER BY table_name;
