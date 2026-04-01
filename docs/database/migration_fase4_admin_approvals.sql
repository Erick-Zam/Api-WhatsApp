-- FASE 4: Admin approvals workflow
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS admin_action_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    payload JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_by_admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    reviewed_by_admin_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_action_approvals_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_admin_action_approvals_status_requested_at
    ON admin_action_approvals(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_approvals_target_user
    ON admin_action_approvals(target_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_action_approvals_requester
    ON admin_action_approvals(requested_by_admin_id);
