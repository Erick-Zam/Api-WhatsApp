import { useMemo } from 'react';
import type { AdminUser } from '@/lib/api/admin';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { formatDateShort } from '@/lib/format/date';

interface AdminUsersTableProps {
    users: AdminUser[];
    loading?: boolean;
    actionUserId?: string;
    canManageRoles?: boolean;
    canLockUsers?: boolean;
    canRotateApiKeys?: boolean;
    onRoleChange: (userId: string, roleName: string) => void;
    onLockToggle: (user: AdminUser) => void;
    onRotateApiKey: (user: AdminUser) => void;
}

const ROLE_OPTIONS = ['general', 'admin', 'super_admin', 'audit_admin', 'user_admin', 'ops_admin'];

export default function AdminUsersTable({
    users,
    loading = false,
    actionUserId = '',
    canManageRoles = true,
    canLockUsers = true,
    canRotateApiKeys = true,
    onRoleChange,
    onLockToggle,
    onRotateApiKey,
}: AdminUsersTableProps) {
    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => {
            if ((a.is_active ?? true) !== (b.is_active ?? true)) {
                return (a.is_active ?? true) ? -1 : 1;
            }
            return (a.username || '').localeCompare(b.username || '');
        });
    }, [users]);

    return (
        <Panel elevated className="overflow-hidden">
            <div className="border-b border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] px-5 py-4">
                <h2 className="theme-text-main text-lg font-bold">User Administration</h2>
                <p className="theme-text-muted mt-1 text-sm">Update roles, lock accounts, and rotate API keys.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left">
                    <thead className="theme-card-strong theme-text-muted text-xs uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]">
                        {!loading && sortedUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="theme-text-soft px-4 py-8 text-center text-sm">
                                    No users found for this tenant.
                                </td>
                            </tr>
                        )}

                        {loading && (
                            <tr>
                                <td colSpan={5} className="theme-text-soft px-4 py-8 text-center text-sm">
                                    Loading users...
                                </td>
                            </tr>
                        )}

                        {sortedUsers.map((user) => {
                            const isBusy = actionUserId === user.id;
                            const isActive = user.is_active ?? true;

                            return (
                                <tr key={user.id} className="bg-[color:color-mix(in_srgb,var(--surface)_85%,transparent)]">
                                    <td className="px-4 py-4">
                                        <p className="theme-text-main font-semibold">{user.username || 'Unnamed user'}</p>
                                        <p className="theme-text-muted text-sm">{user.email}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <select
                                            className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                                            value={user.role || 'general'}
                                            onChange={(event) => onRoleChange(user.id, event.target.value)}
                                            disabled={isBusy || !canManageRoles}
                                        >
                                            {ROLE_OPTIONS.map((role) => (
                                                <option key={role} value={role}>
                                                    {role}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-rose-400'
                                            }`}
                                        >
                                            {isActive ? 'ACTIVE' : 'LOCKED'}
                                        </span>
                                    </td>
                                    <td className="theme-text-muted px-4 py-4 text-sm">{formatDateShort(user.created_at)}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {canLockUsers && (
                                                <Button
                                                    variant={isActive ? 'danger' : 'secondary'}
                                                    size="sm"
                                                    onClick={() => onLockToggle(user)}
                                                    disabled={isBusy}
                                                >
                                                    {isActive ? 'Lock' : 'Unlock'}
                                                </Button>
                                            )}
                                            {canRotateApiKeys && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onRotateApiKey(user)}
                                                    disabled={isBusy}
                                                    className="border border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]"
                                                >
                                                    Rotate key
                                                </Button>
                                            )}
                                            {!canLockUsers && !canRotateApiKeys && <p className="theme-text-soft text-xs">No actions available</p>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}
