-- FASE 3: Audit & Compliance Schema Extension
-- SOC2 Type II & GDPR Compliance Tables
-- Date: March 2026

-- 1. Audit Events Table (Core Auditing)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    event_type VARCHAR(100) NOT NULL,
    -- 'USER_LOGIN', 'USER_LOGOUT', 'API_CALL', 'DATA_ACCESS', 'DATA_MODIFICATION', 'SETTINGS_CHANGE', etc.
    entity_type VARCHAR(100),
    -- The resource being acted upon: 'user', 'session', 'message', 'webhook', etc.
    entity_id VARCHAR(255),
    -- ID of the resource being acted upon
    action VARCHAR(100) NOT NULL,
    -- 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', etc.
    before_state JSONB,
    -- State of resource BEFORE the action
    after_state JSONB,
    -- State of resource AFTER the action
    status VARCHAR(50) DEFAULT 'SUCCESS',
    -- 'SUCCESS', 'FAILED', 'PARTIAL'
    failure_reason TEXT,
    -- If status is 'FAILED', the reason why
    ip_address INET,
    -- IP address of the requester
    user_agent TEXT,
    -- Browser/Client user agent
    request_id VARCHAR(255),
    -- Unique request identifier for correlation
    session_token_hash VARCHAR(255),
    -- Hash of the session token used (for security)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_event_type (event_type),
    INDEX idx_entity_type_id (entity_type, entity_id)
);

-- 2. Data Access Log (Who accessed what, when)
CREATE TABLE IF NOT EXISTS data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    resource_type VARCHAR(100) NOT NULL,
    -- 'messages', 'contacts', 'sessions', 'user_profile', 'api_keys', etc.
    resource_id VARCHAR(255) NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    -- 'READ', 'EXPORT', 'DOWNLOAD', 'SEARCH_QUERY'
    purpose_code VARCHAR(100),
    -- Business purpose: 'API_REQUEST', 'ADMIN_REVIEW', 'SYSTEM_MAINTENANCE', 'USER_REQUEST'
    ip_address INET,
    duration_ms INTEGER,
    -- Time spent accessing/processing the resource
    bytes_transferred INTEGER,
    -- Amount of data transferred
    query_parameters JSONB,
    -- Query params used (sanitized, no secrets)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_resource (user_id, resource_type),
    INDEX idx_timestamp (timestamp)
);

-- 3. Security Events (Login fails, suspicious activity, etc.)
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    -- 'FAILED_LOGIN', 'BRUTE_FORCE_DETECTED', 'SESSION_HIJACK_ATTEMPT', 'INVALID_TOKEN', 'RATE_LIMIT', etc.
    severity VARCHAR(50) NOT NULL,
    -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    email VARCHAR(255),
    -- If user is known, or attempted email
    ip_address INET,
    user_agent TEXT,
    description TEXT,
    action_taken VARCHAR(255),
    -- 'ACCOUNT_LOCKED', 'SESSION_TERMINATED', 'ALERT_SENT', 'NO_ACTION'
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_admin_id UUID REFERENCES api_users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_severity (severity),
    INDEX idx_timestamp (timestamp),
    INDEX idx_email (email)
);

-- 4. Failed Login Attempts (Rate limiting & security monitoring)
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    reason VARCHAR(100),
    -- 'INVALID_PASSWORD', 'INVALID_EMAIL', 'ACCOUNT_LOCKED', 'MFA_FAILED', '2FA_TIMEOUT'
    attempt_number INTEGER,
    -- Counter for brute force detection
    blocked_until TIMESTAMP WITH TIME ZONE,
    -- If account is temporarily locked
    attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_ip (email, ip_address),
    INDEX idx_attempt_at (attempt_at)
);

-- 5. User Role Changes (Track privilege escalation/modification)
CREATE TABLE IF NOT EXISTS user_role_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    old_role_id UUID REFERENCES roles(id),
    new_role_id UUID REFERENCES roles(id),
    changed_by_admin_id UUID REFERENCES api_users(id),
    -- Admin who made the change
    reason TEXT,
    approved BOOLEAN DEFAULT FALSE,
    approved_by_admin_id UUID REFERENCES api_users(id),
    change_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_change_at (change_at)
);

-- 6. Consent Records (GDPR - User Consent Management)
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    consent_type VARCHAR(100) NOT NULL,
    -- 'TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'DATA_PROCESSING', 'MARKETING_EMAIL', 'ANALYTICS', etc.
    consent_given BOOLEAN NOT NULL,
    version VARCHAR(50),
    -- Version of the document the user consented to
    ip_address INET,
    user_agent TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT,
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_consent_type (consent_type),
    INDEX idx_consent_timestamp (consent_timestamp)
);

-- 7. Data Deletion Logs (GDPR Right to be Forgotten)
CREATE TABLE IF NOT EXISTS data_deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    resource_type VARCHAR(100) NOT NULL,
    -- 'messages', 'contacts', 'files', 'entire_profile'
    deletion_reason VARCHAR(100),
    -- 'USER_REQUEST', 'COMPLIANCE_PURGE', 'RETENTION_POLICY', 'ACCOUNT_DELETION'
    records_count INTEGER,
    -- How many records were deleted
    data_snapshot JSONB,
    -- Snapshot of deleted data (for recovery if needed, encrypted)
    deleted_by UUID REFERENCES api_users(id),
    -- If admin deletion, who deleted
    verified_deleted_at TIMESTAMP WITH TIME ZONE,
    -- When deletion was verified
    deletion_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_deletion_at (deletion_at)
);

-- 8. Admin Actions Log (All admin activities)
CREATE TABLE IF NOT EXISTS admin_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES api_users(id),
    action VARCHAR(100) NOT NULL,
    -- 'USER_SUSPENDED', 'USER_ACTIVATED', 'FORCE_PASSWORD_RESET', 'MANUAL_DATA_EXPORT', etc.
    target_user_id UUID REFERENCES api_users(id),
    reason TEXT,
    details JSONB,
    ip_address INET,
    action_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_id (admin_id),
    INDEX idx_action_at (action_at)
);

-- 9. API Key Rotation Log (Security - key management)
CREATE TABLE IF NOT EXISTS api_key_rotation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    old_api_key_hash VARCHAR(255),
    new_api_key_hash VARCHAR(255),
    reason VARCHAR(100),
    -- 'AUTOMATIC_ROTATION', 'USER_REQUESTED', 'COMPROMISED_KEY', 'COMPLIANCE_REQUIREMENT'
    rotated_by_admin_id UUID REFERENCES api_users(id),
    -- If admin-triggered
    rotation_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_rotation_at (rotation_at)
);

-- 10. Session Activity Log (Session-level security)
CREATE TABLE IF NOT EXISTS session_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES whatsapp_sessions(id),
    user_id UUID REFERENCES api_users(id),
    activity_type VARCHAR(100) NOT NULL,
    -- 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'FILE_UPLOADED', 'FILE_DOWNLOAD', 'CONTACT_ADDED', 'TEMPLATE_USED'
    detail JSONB,
    bytes_processed INTEGER,
    api_calls_count INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
);

-- 11. Compliance Reports Log (Track compliance audit runs)
CREATE TABLE IF NOT EXISTS compliance_reports_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    -- 'SOC2_AUDIT', 'GDPR_COMPLIANCE', 'DATA_RETENTION_CHECK', 'SECURITY_AUDIT'
    generated_by_admin_id UUID REFERENCES api_users(id),
    report_data JSONB,
    -- Contains the report findings
    findings_count INTEGER,
    critical_findings INTEGER,
    warnings_count INTEGER,
    compliant BOOLEAN,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_type (report_type),
    INDEX idx_generated_at (generated_at)
);

-- Create indexes for performance on commonly queried fields
CREATE INDEX idx_audit_events_user_timestamp ON audit_events(user_id, timestamp DESC);
CREATE INDEX idx_data_access_logs_user_timestamp ON data_access_logs(user_id, timestamp DESC);
CREATE INDEX idx_security_events_severity_timestamp ON security_events(severity, timestamp DESC);
CREATE INDEX idx_failed_attempts_created_at ON failed_login_attempts(created_at DESC);

-- Add check constraints for data integrity
ALTER TABLE audit_events 
ADD CONSTRAINT check_status CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL'));

ALTER TABLE security_events 
ADD CONSTRAINT check_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

ALTER TABLE failed_login_attempts 
ADD CONSTRAINT check_reason CHECK (reason IN ('INVALID_PASSWORD', 'INVALID_EMAIL', 'ACCOUNT_LOCKED', 'MFA_FAILED', '2FA_TIMEOUT'));

-- Enable Row Level Security (RLS) for sensitive tables
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own audit events
CREATE POLICY audit_events_rls ON audit_events 
FOR SELECT USING (user_id = current_user_id() OR is_admin());

-- Mark that FASE 3 has been run
INSERT INTO schema_migrations (name, executed_at) 
VALUES ('FASE_3_AUDIT_COMPLIANCE', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
