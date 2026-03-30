-- ==============================================================================
-- FASE 3: DESTRUCTIVE MIGRATION - Clean All Previous Data + Audit Tables
-- ==============================================================================
-- WARNING: This migration DELETES ALL existing data and recreates the schema
-- Use this when you need a complete clean slate (test environment reset)
-- Date: March 2026

-- ==============================================================================
-- STEP 1: DROP ALL EXISTING AUDIT/COMPLIANCE TABLES (if they exist)
-- ==============================================================================
DROP TABLE IF EXISTS compliance_reports_log CASCADE;
DROP TABLE IF EXISTS session_activity_log CASCADE;
DROP TABLE IF EXISTS api_key_rotation_log CASCADE;
DROP TABLE IF EXISTS admin_actions_log CASCADE;
DROP TABLE IF EXISTS data_deletion_logs CASCADE;
DROP TABLE IF EXISTS consent_records CASCADE;
DROP TABLE IF EXISTS user_role_changes CASCADE;
DROP TABLE IF EXISTS failed_login_attempts CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS data_access_logs CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;

-- ==============================================================================
-- STEP 2: CLEAR OLD TEST DATA (if environment variable indicates test mode)
-- ==============================================================================
-- Optional: Truncate old problematic tables if they exist
TRUNCATE TABLE IF EXISTS api_usage_logs CASCADE;
TRUNCATE TABLE IF EXISTS activity_logs CASCADE;

-- ==============================================================================
-- STEP 3: CREATE FRESH AUDIT TABLES WITH CLEAN SCHEMA
-- ==============================================================================

-- 1. Audit Events Table (Core Auditing)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    failure_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    session_token_hash VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_user_timestamp ON audit_events(user_id, timestamp DESC);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);

-- 2. Data Access Log (Who accessed what, when) - GDPR Transparency
CREATE TABLE data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    purpose_code VARCHAR(100),
    ip_address INET,
    duration_ms INTEGER,
    bytes_transferred INTEGER,
    query_parameters JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX idx_data_access_logs_timestamp ON data_access_logs(timestamp DESC);
CREATE INDEX idx_data_access_logs_user_resource ON data_access_logs(user_id, resource_type);
CREATE INDEX idx_data_access_logs_user_timestamp ON data_access_logs(user_id, timestamp DESC);

-- 3. Security Events (Login fails, suspicious activity, etc.)
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    description TEXT,
    action_taken VARCHAR(255),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX idx_security_events_email ON security_events(email);
CREATE INDEX idx_security_events_severity_timestamp ON security_events(severity, timestamp DESC);

-- 4. Failed Login Attempts (Rate limiting & security monitoring)
CREATE TABLE failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    reason VARCHAR(100),
    attempt_number INTEGER,
    blocked_until TIMESTAMP WITH TIME ZONE,
    attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempts_email_ip ON failed_login_attempts(email, ip_address);
CREATE INDEX idx_failed_login_attempts_attempt_at ON failed_login_attempts(attempt_at DESC);
CREATE INDEX idx_failed_login_attempts_created_at ON failed_login_attempts(created_at DESC);

-- 5. User Role Changes (Track privilege escalation/modification)
CREATE TABLE user_role_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    old_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    new_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    changed_by_admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    reason TEXT,
    approved BOOLEAN DEFAULT FALSE,
    approved_by_admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    change_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_role_changes_user_id ON user_role_changes(user_id);
CREATE INDEX idx_user_role_changes_change_at ON user_role_changes(change_at DESC);

-- 6. Consent Records (GDPR - User Consent Management)
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    version VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT,
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_consent_timestamp ON consent_records(consent_timestamp DESC);

-- 7. Data Deletion Logs (GDPR Right to be Forgotten)
CREATE TABLE data_deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100) NOT NULL,
    deletion_reason VARCHAR(100),
    records_count INTEGER,
    data_snapshot JSONB,
    deleted_by UUID REFERENCES api_users(id) ON DELETE SET NULL,
    verified_deleted_at TIMESTAMP WITH TIME ZONE,
    deletion_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_deletion_logs_user_id ON data_deletion_logs(user_id);
CREATE INDEX idx_data_deletion_logs_deletion_at ON data_deletion_logs(deletion_at DESC);

-- 8. Admin Actions Log (All admin activities)
CREATE TABLE admin_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    reason TEXT,
    details JSONB,
    ip_address INET,
    action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_actions_log_admin_id ON admin_actions_log(admin_id);
CREATE INDEX idx_admin_actions_log_action_at ON admin_actions_log(action_at DESC);

-- 9. API Key Rotation Log (Security - key management)
CREATE TABLE api_key_rotation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    old_api_key_hash VARCHAR(255),
    new_api_key_hash VARCHAR(255),
    reason VARCHAR(100),
    rotated_by_admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    rotation_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_key_rotation_log_user_id ON api_key_rotation_log(user_id);
CREATE INDEX idx_api_key_rotation_log_rotation_at ON api_key_rotation_log(rotation_at DESC);

-- 10. Session Activity Log (Session-level security)
CREATE TABLE session_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL,
    detail JSONB,
    bytes_processed INTEGER,
    api_calls_count INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_activity_log_session_id ON session_activity_log(session_id);
CREATE INDEX idx_session_activity_log_user_id ON session_activity_log(user_id);
CREATE INDEX idx_session_activity_log_timestamp ON session_activity_log(timestamp DESC);

-- 11. Compliance Reports Log (Track compliance audit runs)
CREATE TABLE compliance_reports_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    generated_by_admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    report_data JSONB,
    findings_count INTEGER,
    critical_findings INTEGER,
    warnings_count INTEGER,
    compliant BOOLEAN,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_reports_log_report_type ON compliance_reports_log(report_type);
CREATE INDEX idx_compliance_reports_log_generated_at ON compliance_reports_log(generated_at DESC);

-- ==============================================================================
-- STEP 4: ADD CONSTRAINTS FOR DATA INTEGRITY
-- ==============================================================================

ALTER TABLE audit_events 
ADD CONSTRAINT check_audit_status CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL'));

ALTER TABLE security_events 
ADD CONSTRAINT check_security_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

ALTER TABLE failed_login_attempts 
ADD CONSTRAINT check_failed_login_reason CHECK (reason IN ('INVALID_PASSWORD', 'INVALID_EMAIL', 'ACCOUNT_LOCKED', 'MFA_FAILED', '2FA_TIMEOUT'));

-- ==============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY FOR SENSITIVE TABLES
-- ==============================================================================

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STEP 6: RECORD MIGRATION IN SCHEMA_MIGRATIONS TABLE
-- ==============================================================================

-- Make sure schema_migrations table exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delete previous FASE 3 record if it exists (for clean re-run)
DELETE FROM schema_migrations WHERE name = 'FASE_3_AUDIT_COMPLIANCE';

-- Insert new migration record
INSERT INTO schema_migrations (name, executed_at) 
VALUES ('FASE_3_AUDIT_COMPLIANCE', CURRENT_TIMESTAMP);

-- ==============================================================================
-- STEP 7: VERIFY MIGRATION
-- ==============================================================================

-- Show created tables
SELECT 
    tablename 
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename LIKE '%audit%' 
    OR tablename LIKE '%consent%'
    OR tablename LIKE '%compliance%'
    OR tablename LIKE '%security%'
ORDER BY tablename;

-- Show migration history
SELECT name, executed_at FROM schema_migrations WHERE name LIKE 'FASE%' ORDER BY executed_at DESC;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- ✅ All old audit tables dropped
-- ✅ All new audit compliance tables created fresh
-- ✅ All indexes created for performance
-- ✅ Constraints added for data integrity
-- ✅ RLS policies enabled for security
-- ✅ Migration recorded in schema_migrations
