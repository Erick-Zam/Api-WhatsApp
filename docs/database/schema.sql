-- Database Schema for WhatsApp API SaaS (PostgreSQL)

-- 1. Users Table (Expanded for SaaS)
CREATE TABLE api_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- For web login
    api_key VARCHAR(255) UNIQUE NOT NULL, -- For API access
    role VARCHAR(50) DEFAULT 'client', -- 'admin', 'client'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sessions Table (WhatsApp Connected Devices)
CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    session_name VARCHAR(255) NOT NULL, 
    status VARCHAR(50) DEFAULT 'DISCONNECTED', -- 'CONNECTED', 'SCANNING', 'DISCONNECTED'
    auth_data JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_name) -- User can't have duplicate session names
);

-- 3. Contacts Table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id), -- Contacts belong to a user
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

-- 5. Audit Logs (System Activity)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    action VARCHAR(255) NOT NULL, -- e.g. 'LOGIN', 'CREATE_SESSION', 'Update Settings'
    resource VARCHAR(255), -- e.g. 'Session #2'
    details JSONB, -- Previous values or metadata
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Error Logs (System Failures)
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(100), -- 'Backend API', 'Worker', 'Auth'
    error_message TEXT,
    stack_trace TEXT,
    context_data JSONB, -- Request body, user ID, etc.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_message_logs_user ON message_logs(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
