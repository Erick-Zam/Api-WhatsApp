import { apiRequest } from '@/lib/api/client';

export interface AdminStats {
    users: number;
    totalRequests?: number;
    errors?: number;
}

export interface AdminUser {
    id: string;
    username: string;
    email: string;
    role: string;
    created_at: string;
    is_active?: boolean;
}

export interface AdminCurrentUser {
    id: string;
    username: string;
    email: string;
    role: string;
}

export interface AuditEvent {
    id: string;
    user_id?: string | null;
    event_type: string;
    entity_type?: string | null;
    entity_id?: string | null;
    action: string;
    status: string;
    failure_reason?: string | null;
    ip_address?: string | null;
    timestamp: string;
}

export interface SecurityEvent {
    id: string;
    event_type: string;
    severity: string;
    email?: string | null;
    ip_address?: string | null;
    description?: string | null;
    action_taken?: string | null;
    is_resolved: boolean;
    timestamp: string;
}

export interface EngineHealthTotal {
    engine_type: string;
    total_sessions: number;
    connected_sessions: number;
}

export interface EngineHealthBreakdown {
    engine_type: string;
    health_status: string;
    count: number;
}

export interface EngineHealthMetric {
    engine_type: string;
    avg_latency_ms?: number | null;
    avg_error_rate?: number | null;
    avg_uptime_percent?: number | null;
}

export interface AdminEngineHealthResponse {
    totals: EngineHealthTotal[];
    healthBreakdown: EngineHealthBreakdown[];
    recentMetrics: EngineHealthMetric[];
    warning?: string;
}

export interface AdminApproval {
    id: string;
    action_type: string;
    target_user_id?: string | null;
    payload?: Record<string, unknown> | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requested_by_admin_id?: string | null;
    reviewed_by_admin_id?: string | null;
    reason?: string | null;
    requested_at: string;
    reviewed_at?: string | null;
}

interface PaginationOptions {
    limit?: number;
    offset?: number;
}

export const getAdminStats = () => apiRequest<AdminStats>('/admin/stats');

export const getAdminUsers = () => apiRequest<AdminUser[]>('/admin/users');

export const updateAdminUserRole = (userId: string, roleName: string, reason?: string) =>
    apiRequest<{ message: string }>(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: { roleName, reason },
    });

export const lockAdminUser = (userId: string, reason?: string) =>
    apiRequest<{ message: string }>(`/admin/users/${userId}/lock`, {
        method: 'POST',
        body: { reason },
    });

export const unlockAdminUser = (userId: string, reason?: string) =>
    apiRequest<{ message: string }>(`/admin/users/${userId}/unlock`, {
        method: 'POST',
        body: { reason },
    });

export const rotateAdminUserApiKey = (userId: string, reason?: string) =>
    apiRequest<{ message: string; apiKey: string }>(`/admin/users/${userId}/api-key/rotate`, {
        method: 'POST',
        body: { reason },
    });

export const getAdminAuditEvents = ({ limit = 10, offset = 0 }: PaginationOptions = {}) =>
    apiRequest<AuditEvent[]>(`/admin/audit/events?limit=${limit}&offset=${offset}`);

export const getAdminSecurityEvents = ({ limit = 10, offset = 0 }: PaginationOptions = {}) =>
    apiRequest<SecurityEvent[]>(`/admin/audit/security?limit=${limit}&offset=${offset}`);

export const getAdminEngineHealth = () => apiRequest<AdminEngineHealthResponse>('/admin/engine-health');

export const getAdminCurrentUser = () => apiRequest<{ user: AdminCurrentUser }>('/auth/me');

export const getAdminApprovals = ({ limit = 10, offset = 0 }: PaginationOptions = {}) =>
    apiRequest<AdminApproval[]>(`/admin/approvals?limit=${limit}&offset=${offset}`);

export const approveAdminApproval = (approvalId: string, reason?: string) =>
    apiRequest<{ message: string; approval: AdminApproval }>(`/admin/approvals/${approvalId}/approve`, {
        method: 'POST',
        body: { reason },
    });

export const rejectAdminApproval = (approvalId: string, reason?: string) =>
    apiRequest<{ message: string; approval: AdminApproval }>(`/admin/approvals/${approvalId}/reject`, {
        method: 'POST',
        body: { reason },
    });
