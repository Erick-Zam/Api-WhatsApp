"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UsageLog {
    id: number;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    created_at: string;
}

export default function LogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/logs`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            } else if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                router.push('/login');
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getTimeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (seconds < 60) return 'just now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-black dark:text-white">Logs & Activity</h2>

            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="p-4">Method</th>
                            <th className="p-4">Endpoint</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {logs.length > 0 ? logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.method === 'POST'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                        {log.method}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-800 dark:text-gray-300 font-mono text-sm">
                                    {log.endpoint}
                                </td>
                                <td className="p-4">
                                    <span className={`text-xs font-bold ${log.status_code < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                        {log.status_code}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-right text-xs">{getTimeAgo(log.created_at)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-gray-500">
                                    {loading ? 'Loading logs...' : 'No activity found yet.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="p-4 text-center text-gray-500 text-sm border-t border-gray-200 dark:border-zinc-800">
                    Listening for real-time updates...
                </div>
            </div>
        </div>
    );
}
