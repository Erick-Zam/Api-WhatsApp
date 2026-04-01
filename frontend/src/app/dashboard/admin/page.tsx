'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminApproval, AdminEngineHealthResponse, AdminStats, AdminUser, AuditEvent, SecurityEvent } from '@/lib/api/admin';
import {
    approveAdminApproval,
    getAdminApprovals,
    getAdminAuditEvents,
    getAdminCurrentUser,
    getAdminEngineHealth,
    rejectAdminApproval,
    getAdminSecurityEvents,
    getAdminStats,
    getAdminUsers,
    lockAdminUser,
    rotateAdminUserApiKey,
    unlockAdminUser,
    updateAdminUserRole,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsersTable from '@/components/admin/AdminUsersTable';
import AdminSecurityFeed from '@/components/admin/AdminSecurityFeed';
import AdminEngineHealth from '@/components/admin/AdminEngineHealth';
import AdminApprovalsQueue from '@/components/admin/AdminApprovalsQueue';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';

export default function AdminPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
    const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
    const [engineHealth, setEngineHealth] = useState<AdminEngineHealthResponse | null>(null);
    const [approvals, setApprovals] = useState<AdminApproval[]>([]);
    const [currentRole, setCurrentRole] = useState('');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [actionUserId, setActionUserId] = useState('');
    const [actionApprovalId, setActionApprovalId] = useState('');

    const loadAdminData = useCallback(async ({ showSpinner = false } = {}) => {
        if (showSpinner) {
            setRefreshing(true);
        }
        setError('');

        try {
            const meData = await getAdminCurrentUser();
            const role = meData.user?.role || 'general';
            setCurrentRole(role);

            const canViewAudit = ['admin', 'super_admin', 'audit_admin'].includes(role);
            const canViewSecurity = ['admin', 'super_admin', 'audit_admin', 'ops_admin'].includes(role);
            const canViewEngine = ['admin', 'super_admin', 'ops_admin'].includes(role);
            const canViewApprovals = ['admin', 'super_admin'].includes(role);

            const mandatoryRequests = await Promise.all([getAdminStats(), getAdminUsers()]);
            const [statsData, usersData] = mandatoryRequests;

            setStats(statsData);
            setUsers(usersData);

            const optionalRequests = await Promise.allSettled([
                canViewAudit ? getAdminAuditEvents({ limit: 12 }) : Promise.resolve([]),
                canViewSecurity ? getAdminSecurityEvents({ limit: 12 }) : Promise.resolve([]),
                canViewEngine ? getAdminEngineHealth() : Promise.resolve(null),
                canViewApprovals ? getAdminApprovals({ limit: 12 }) : Promise.resolve([]),
            ]);

            const [auditResult, securityResult, engineResult, approvalsResult] = optionalRequests;

            setAuditEvents(auditResult.status === 'fulfilled' ? (auditResult.value as AuditEvent[]) : []);
            setSecurityEvents(securityResult.status === 'fulfilled' ? (securityResult.value as SecurityEvent[]) : []);
            setEngineHealth(engineResult.status === 'fulfilled' ? (engineResult.value as AdminEngineHealthResponse | null) : null);
            setApprovals(approvalsResult.status === 'fulfilled' ? (approvalsResult.value as AdminApproval[]) : []);
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                if (requestError.status === 401) {
                    localStorage.removeItem('token');
                    router.replace('/?auth=login');
                    return;
                }

                if (requestError.status === 403) {
                    setError('Access denied for this admin section with your current role.');
                    return;
                }

                setError(requestError.message);
                return;
            }

            setError('Failed to load administration data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) {
            return;
        }
        loadAdminData();
    }, [mounted, loadAdminData]);

    const handleRoleChange = useCallback(async (userId: string, roleName: string) => {
        setActionUserId(userId);
        setError('');
        setSuccess('');

        try {
            await updateAdminUserRole(userId, roleName, 'Updated from admin dashboard');
            setSuccess('User role updated successfully.');
            await loadAdminData({ showSpinner: true });
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Unable to update user role.');
            }
        } finally {
            setActionUserId('');
        }
    }, [loadAdminData]);

    const handleLockToggle = useCallback(async (user: AdminUser) => {
        setActionUserId(user.id);
        setError('');
        setSuccess('');

        try {
            if (user.is_active ?? true) {
                await lockAdminUser(user.id, 'Locked from admin dashboard');
                setSuccess(`User ${user.username} has been locked.`);
            } else {
                await unlockAdminUser(user.id, 'Unlocked from admin dashboard');
                setSuccess(`User ${user.username} has been unlocked.`);
            }
            await loadAdminData({ showSpinner: true });
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Unable to update user status.');
            }
        } finally {
            setActionUserId('');
        }
    }, [loadAdminData]);

    const handleRotateApiKey = useCallback(async (user: AdminUser) => {
        setActionUserId(user.id);
        setError('');
        setSuccess('');

        try {
            await rotateAdminUserApiKey(user.id, 'Rotated from admin dashboard');
            setSuccess(`API key rotated for ${user.username}.`);
            await loadAdminData({ showSpinner: true });
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Unable to rotate API key.');
            }
        } finally {
            setActionUserId('');
        }
    }, [loadAdminData]);

    const handleApprove = useCallback(async (approval: AdminApproval) => {
        setActionApprovalId(approval.id);
        setError('');
        setSuccess('');

        try {
            await approveAdminApproval(approval.id, 'Approved from admin dashboard');
            setSuccess('Approval marked as approved.');
            await loadAdminData({ showSpinner: true });
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Unable to approve request.');
            }
        } finally {
            setActionApprovalId('');
        }
    }, [loadAdminData]);

    const handleReject = useCallback(async (approval: AdminApproval) => {
        setActionApprovalId(approval.id);
        setError('');
        setSuccess('');

        try {
            await rejectAdminApproval(approval.id, 'Rejected from admin dashboard');
            setSuccess('Approval marked as rejected.');
            await loadAdminData({ showSpinner: true });
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Unable to reject request.');
            }
        } finally {
            setActionApprovalId('');
        }
    }, [loadAdminData]);

    const openSecurityIssues = useMemo(() => {
        return securityEvents.filter((event) => !event.is_resolved).length;
    }, [securityEvents]);

    const canManageRoles = useMemo(() => ['admin', 'super_admin', 'user_admin'].includes(currentRole), [currentRole]);
    const canLockUsers = useMemo(() => ['admin', 'super_admin', 'user_admin', 'ops_admin'].includes(currentRole), [currentRole]);
    const canRotateApiKeys = useMemo(() => ['admin', 'super_admin', 'ops_admin'].includes(currentRole), [currentRole]);
    const canViewEngine = useMemo(() => ['admin', 'super_admin', 'ops_admin'].includes(currentRole), [currentRole]);
    const canViewSecurity = useMemo(() => ['admin', 'super_admin', 'audit_admin', 'ops_admin'].includes(currentRole), [currentRole]);
    const canViewAudit = useMemo(() => ['admin', 'super_admin', 'audit_admin'].includes(currentRole), [currentRole]);
    const canViewApprovals = useMemo(() => ['admin', 'super_admin'].includes(currentRole), [currentRole]);

    if (!mounted) {
        return (
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-6">
                <section className="rounded-2xl surface-card p-5 md:p-6">
                    <p className="text-sm text-slate-400">Loading administration workspace...</p>
                </section>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-6">
            <section className="rounded-2xl surface-card--elevated p-5 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">Control Center</p>
                        <h1 className="mt-1 text-3xl font-bold text-slate-100">Administration</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-300">
                            Manage roles, lock and unlock users, rotate API keys, and monitor security events in real time.
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        className="self-start"
                        loading={refreshing}
                        onClick={() => loadAdminData({ showSpinner: true })}
                        disabled={refreshing}
                    >
                        {refreshing ? 'Refreshing...' : 'Refresh data'}
                    </Button>
                </div>
            </section>

            {error && <Alert tone="error" title="Action failed">{error}</Alert>}
            {success && <Alert tone="success" title="Action completed">{success}</Alert>}

            <AdminOverview stats={stats} loading={loading} openSecurityIssues={openSecurityIssues} />

            <AdminUsersTable
                users={users}
                loading={loading}
                actionUserId={actionUserId}
                canManageRoles={canManageRoles}
                canLockUsers={canLockUsers}
                canRotateApiKeys={canRotateApiKeys}
                onRoleChange={handleRoleChange}
                onLockToggle={handleLockToggle}
                onRotateApiKey={handleRotateApiKey}
            />

            {canViewEngine && <AdminEngineHealth data={engineHealth} loading={loading} />}

            {canViewApprovals && (
                <AdminApprovalsQueue
                    approvals={approvals}
                    loading={loading}
                    actionApprovalId={actionApprovalId}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}

            {(canViewAudit || canViewSecurity) && (
                <AdminSecurityFeed
                    auditEvents={canViewAudit ? auditEvents : []}
                    securityEvents={canViewSecurity ? securityEvents : []}
                    loading={loading}
                />
            )}
        </div>
    );
}
