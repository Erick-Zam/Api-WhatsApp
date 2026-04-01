"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
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

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<UsageLog | null>(null);
    const itemsPerPage = 15;

    const fetchLogs = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/?auth=login');
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
                router.replace('/?auth=login');
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

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const searchLower = searchQuery.toLowerCase();
            return (
                log.endpoint.toLowerCase().includes(searchLower) ||
                log.method.toLowerCase().includes(searchLower) ||
                log.status_code.toString().includes(searchLower)
            );
        });
    }, [logs, searchQuery]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLogs, currentPage, itemsPerPage]);

    const openModal = (log: UsageLog) => {
        setSelectedLog(log);
    };

    const closeModal = () => {
        setSelectedLog(null);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const getStatusColorClass = (code: number) => {
        if (code >= 200 && code < 300) return 'text-green-500';
        if (code >= 300 && code < 400) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getMethodColorClass = (method: string) => {
        if (method === 'POST') return 'bg-blue-500/15 text-blue-500 border border-blue-500/30';
        if (method === 'GET') return 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30';
        return 'bg-amber-500/15 text-amber-500 border border-amber-500/30';
    };

    return (
        <div className="max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="theme-text-main text-3xl font-bold">Logs & Activity</h2>
                <div className="relative w-full sm:w-64">
                    <input 
                        type="text" 
                        placeholder="Search logs..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="theme-input w-full rounded-lg px-4 py-2"
                    />
                </div>
            </div>

            <div className="theme-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-max">
                        <thead className="theme-card-strong theme-text-muted">
                            <tr>
                                <th className="p-4">Method</th>
                                <th className="p-4">Endpoint</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Time</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]">
                            {paginatedLogs.length > 0 ? paginatedLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[color:color-mix(in_srgb,var(--surface-muted)_82%,transparent)] transition-colors">
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodColorClass(log.method)}`}>
                                            {log.method}
                                        </span>
                                    </td>
                                    <td className="p-4 theme-text-main font-mono text-sm max-w-[200px] sm:max-w-md truncate">
                                        {log.endpoint}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold ${getStatusColorClass(log.status_code)}`}>
                                            {log.status_code}
                                        </span>
                                    </td>
                                    <td className="p-4 theme-text-soft text-right text-xs whitespace-nowrap">{getTimeAgo(log.created_at)}</td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => openModal(log)}
                                            className="theme-button-secondary text-xs px-3 py-1 rounded transition-colors"
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center theme-text-muted">
                                        {loading ? 'Loading logs...' : 'No activity found matching your criteria.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 1 && (
                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]">
                        <div className="text-sm theme-text-muted">
                            Showing <span className="font-medium theme-text-main">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium theme-text-main">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-medium theme-text-main">{filteredLogs.length}</span> results
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="theme-button-secondary px-3 py-1 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 text-sm theme-text-muted flex items-center">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="theme-button-secondary px-3 py-1 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button 
                        type="button"
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity w-full h-full cursor-default" 
                        onClick={closeModal}
                        aria-label="Close backdrop"
                    />
                    <dialog 
                        open
                        className="theme-card relative rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] p-0 border-none" 
                        aria-labelledby="modal-title"
                    >
                        <div className="flex justify-between items-center p-4 border-b border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]">
                            <h3 id="modal-title" className="text-lg font-bold theme-text-main">Log Details</h3>
                            <button 
                                onClick={closeModal}
                                className="theme-text-muted hover:text-[color:var(--foreground)] transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="theme-text-soft mb-1 text-xs uppercase font-semibold">Method</p>
                                    <div className="theme-code-block font-mono px-3 py-2 rounded">{selectedLog.method}</div>
                                </div>
                                <div>
                                    <p className="theme-text-soft mb-1 text-xs uppercase font-semibold">Status Code</p>
                                    <div className={`font-mono font-bold px-3 py-2 rounded theme-card-strong ${getStatusColorClass(selectedLog.status_code)}`}>
                                        {selectedLog.status_code}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="theme-text-soft mb-1 text-xs uppercase font-semibold">Endpoint</p>
                                <div className="theme-code-block font-mono px-3 py-2 rounded break-all">{selectedLog.endpoint}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="theme-text-soft mb-1 text-xs uppercase font-semibold">Response Time</p>
                                    <div className="theme-code-block font-mono px-3 py-2 rounded">{selectedLog.response_time_ms} ms</div>
                                </div>
                                <div>
                                    <p className="theme-text-soft mb-1 text-xs uppercase font-semibold">Log ID</p>
                                    <div className="theme-code-block font-mono px-3 py-2 rounded"># {selectedLog.id}</div>
                                </div>
                            </div>
                            <div>
                                <p className="theme-text-soft mb-1 text-xs uppercase font-semibold">Timestamp</p>
                                <div className="theme-code-block font-mono px-3 py-2 rounded">{new Date(selectedLog.created_at).toLocaleString()} ({getTimeAgo(selectedLog.created_at)})</div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] text-right">
                            <button 
                                onClick={closeModal}
                                className="theme-button-secondary px-4 py-2 font-medium rounded transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </dialog>
                </div>
            )}
        </div>
    );
}
