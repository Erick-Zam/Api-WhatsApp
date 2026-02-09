'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState<any>(null);

    const authorizedFetch = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            throw new Error('No token');
        }

        const res = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            router.push('/login');
            throw new Error('Unauthorized');
        }

        if (res.status === 403) {
            setError('Access Denied: Admin privileges required.');
            setLoading(false);
            throw new Error('Forbidden');
        }

        return res;
    };

    const fetchStats = async () => {
        try {
            const res = await authorizedFetch('http://localhost:3001/api/admin/stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await authorizedFetch('http://localhost:3001/api/admin/users');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchStats();
            await fetchUsers();
        };
        init();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const res = await authorizedFetch(`http://localhost:3001/api/admin/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ roleName: newRole })
            });

            if (res.ok) {
                alert('Role updated successfully');
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Failed to update role: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
                <h2 className="text-2xl font-bold mb-2">Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading admin dashboard...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-black dark:text-white">Admin Dashboard</h1>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                        <h3 className="text-sm font-bold text-gray-500 uppercase">Total Users</h3>
                        <p className="text-3xl font-bold text-black dark:text-white mt-2">{stats.users}</p>
                    </div>
                    {/* Placeholder stats if not available in endpoint */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                        <h3 className="text-sm font-bold text-gray-500 uppercase">Total Requests</h3>
                        <p className="text-3xl font-bold text-black dark:text-white mt-2">{stats.totalRequests || '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                        <h3 className="text-sm font-bold text-gray-500 uppercase">Errors</h3>
                        <p className="text-3xl font-bold text-black dark:text-white mt-2">{stats.errors || 0}</p>
                    </div>
                </div>
            )}

            {/* Users Management */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
                    <h2 className="text-xl font-bold text-black dark:text-white">User Management</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Username</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Created At</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                    <td className="p-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                                        {user.id.toString().substring(0, 8)}...
                                    </td>
                                    <td className="p-4 font-medium text-gray-900 dark:text-white">{user.username}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            }`}>
                                            {user.role?.toUpperCase() || 'GENERAL'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4">
                                        <select
                                            className="bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded px-2 py-1 text-sm dark:text-white"
                                            value={user.role || 'general'}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        >
                                            <option value="general">General</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
