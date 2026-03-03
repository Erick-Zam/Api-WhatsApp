-- Database Schema for WhatsApp API SaaS (PostgreSQL)
-- 0. Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    -- 'admin', 'general'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Seed default roles (This fits here for initialization)
INSERT INTO roles (name, description)
VALUES ('admin', 'System Administrator - Full Access'),
    (
        'general',
        'Regular User - access to own resources'
    );
-- 1. Users Table (Expanded for SaaS)
CREATE TABLE api_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    -- For web login
    api_key VARCHAR(255) UNIQUE NOT NULL,
    -- For API access
    role_id UUID REFERENCES roles(id),
    -- Foreign Key to roles
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 2. Sessions Table (WhatsApp Connected Devices)
-- 2. Sessions Table (WhatsApp Connected Devices)
CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    session_id VARCHAR(255) NOT NULL,
    -- The session identifier string (e.g. 'marketing')
    status VARCHAR(50) DEFAULT 'DISCONNECTED',
    -- 'CONNECTED', 'SCANNING', 'DISCONNECTED'
    auth_data JSONB,
    api_key VARCHAR(255),
    -- API Key specific to this session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_id),
    -- User can't have duplicate session names
    UNIQUE(session_id) -- Enforce global uniqueness for now to prevent filesystem collisions
);
-- 3. Contacts Table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    -- Contacts belong to a user
    jid VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    custom_name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, jid)
);
-- 4. Message Logs Table (Expanded)
CREATE TABLE message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    session_id UUID REFERENCES whatsapp_sessions(id),
    remote_jid VARCHAR(255),
    direction VARCHAR(10) CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    message_type VARCHAR(50),
    content TEXT,
    media_url TEXT,
    status VARCHAR(50) DEFAULT 'SENT',
    raw_message JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 5. Activity Logs (System Activity)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 6. API Usage Logs (Per Request)
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 7. Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    -- Logical session ID (name)
    url TEXT NOT NULL,
    events TEXT [],
    -- Array of event strings
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 8. Scheduled Messages
CREATE TABLE scheduled_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
-- 6. Error Logs (System Failures)
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(100),
    -- 'Backend API', 'Worker', 'Auth'
    error_message TEXT,
    stack_trace TEXT,
    context_data JSONB,
    -- Request body, user ID, etc.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Indexes
CREATE INDEX idx_message_logs_user ON message_logs(user_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);