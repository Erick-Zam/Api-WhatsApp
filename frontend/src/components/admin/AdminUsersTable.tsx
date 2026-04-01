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
        <Panel className="overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-lg font-bold text-white">User Administration</h2>
                <p className="mt-1 text-sm text-zinc-400">Update roles, lock accounts, and rotate API keys.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left">
                    <thead className="bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-400">
                        <tr>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {!loading && sortedUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                                    No users found for this tenant.
                                </td>
                            </tr>
                        )}

                        {loading && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                                    Loading users...
                                </td>
                            </tr>
                        )}

                        {sortedUsers.map((user) => {
                            const isBusy = actionUserId === user.id;
                            const isActive = user.is_active ?? true;

                            return (
                                <tr key={user.id} className="bg-zinc-950/20">
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-white">{user.username || 'Unnamed user'}</p>
                                        <p className="text-sm text-zinc-400">{user.email}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <select
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
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
                                                isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                            }`}
                                        >
                                            {isActive ? 'ACTIVE' : 'LOCKED'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-zinc-400">{formatDateShort(user.created_at)}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {canLockUsers && (
                                                <Button
                                                    variant={isActive ? 'danger' : 'secondary'}
                                                    onClick={() => onLockToggle(user)}
                                                    disabled={isBusy}
                                                    className="px-3 py-2 text-xs"
                                                >
                                                    {isActive ? 'Lock' : 'Unlock'}
                                                </Button>
                                            )}
                                            {canRotateApiKeys && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => onRotateApiKey(user)}
                                                    disabled={isBusy}
                                                    className="border border-zinc-700 px-3 py-2 text-xs"
                                                >
                                                    Rotate key
                                                </Button>
                                            )}
                                            {!canLockUsers && !canRotateApiKeys && <p className="text-xs text-zinc-500">No actions available</p>}
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
