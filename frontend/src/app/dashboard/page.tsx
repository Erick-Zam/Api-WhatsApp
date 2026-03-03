'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Session {
    id: string;
    status: string;
    user?: {
        id?: string;
    };
}

export default function Dashboard() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSessionId, setNewSessionId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
    const [qrLoading, setQrLoading] = useState<{ [key: string]: boolean }>({});
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const t = localStorage.getItem('token');
        if (t === null) {
            globalThis.location.href = '/login';
        } else {
            setToken(t);
        }
    }, []);

    const authorizedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        if (!token) return null;
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
            globalThis.location.href = '/login';
            throw new Error('Unauthorized');
        }
        return res;
    }, [token]);

    // Fetch sessions first, but it will need fetchQr
    const fetchSessions = useCallback(async () => {
        if (!token) return;
        try {
            const res = await authorizedFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/sessions`);
            if (res?.ok === false || res === null) return;

            const data = await res.json();
            if (Array.isArray(data)) {
                setSessions(data);

                // For any session not connected, try to fetch its QR
                data.forEach((s: Session) => {
                    if (s.status !== 'CONNECTED' && !qrLoading[s.id]) {
                        // Using a function reference that will be defined below
                        fetchQr(s.id);
                    }
                });
            } else {
                console.error('Invalid sessions data:', data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, authorizedFetch, qrLoading]); // We'll add fetchQr to deps after fixing circularity or ignore it

    const fetchQr = useCallback(async (sessionId: string) => {
        if (!token) return;
        try {
            const res = await authorizedFetch(`/api/qr?sessionId=${sessionId}`);
            if (res?.ok === false || res === null) return;

            const data = await res.json();
            if (data.qr) {
                setQrCodes(prev => ({ ...prev, [sessionId]: data.qr }));
            } else if (data.status === 'CONNECTED') {
                // Remove immediate fetchSessions() call to break circular dependency.
                // The 5-second polling interval will refresh the UI automatically.
                console.log(`Session ${sessionId} connected, waiting for poll refresh...`);
            }
        } catch (error) {
            console.error(`Error fetching QR for ${sessionId}:`, error);
        }
    }, [token, authorizedFetch]);


    useEffect(() => {
        if (token) {
            fetchSessions();
            const interval = setInterval(fetchSessions, 5000);
            return () => clearInterval(interval);
        }
    }, [token, fetchSessions]);

    const handleCreateSession = async () => {
        if (!newSessionId || isCreating || !token) return;
        setIsCreating(true);
        try {
            await authorizedFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/whatsapp/connect`, {
                method: 'POST',
                body: JSON.stringify({ sessionId: newSessionId })
            });
            setNewSessionId('');
            fetchSessions();
        } catch (err) {
            console.error('Error creating session:', err);
            alert('Error creating session');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm(`Are you sure you want to permanently delete session '${sessionId}'? This cannot be undone.`)) return;
        try {
            await authorizedFetch(`/api/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            // Clear QR code if exists
            setQrCodes(prev => {
                const newCodes = { ...prev };
                delete newCodes[sessionId];
                return newCodes;
            });
            fetchSessions();
        } catch (err) {
            console.error('Error deleting session:', err);
            alert('Error deleting session');
        }
    };

    const handleDisconnect = async (sessionId: string) => {
        if (!confirm(`Disconnect session '${sessionId}'?`)) return;
        try {
            await authorizedFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/whatsapp/logout`, {
                method: 'POST',
                body: JSON.stringify({ sessionId })
            });
            fetchSessions();
        } catch (err) {
            console.error('Error disconnecting:', err);
            alert('Error disconnecting');
        }
    };

    const handleReconnect = async (sessionId: string) => {
        try {
            console.log(`[Dashboard] Initiating connection for ${sessionId}...`);
            setQrLoading(prev => ({ ...prev, [sessionId]: true }));

            const res = await authorizedFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/whatsapp/connect`, {
                method: 'POST',
                body: JSON.stringify({ sessionId })
            });

            if (res?.ok === false || res === null) {
                console.error(`[Dashboard] Connect request failed for ${sessionId}`, res?.status);
                setQrLoading(prev => ({ ...prev, [sessionId]: false }));
                alert('Failed to start connection process');
                return;
            }

            console.log(`[Dashboard] Connection process started. Polling for QR...`);

            // Poll for QR code every 1 second for 30 seconds
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                // Stop if we have navigatged away or component unmounted (simple check)

                try {
                    const qrRes = await authorizedFetch(`/api/qr?sessionId=${sessionId}`);
                    if (qrRes?.ok === true) {
                        const data = await qrRes.json();
                        if (data.qr) {
                            console.log(`[Dashboard] QR Code received for ${sessionId}`);
                            setQrCodes(prev => ({ ...prev, [sessionId]: data.qr }));
                            setQrLoading(prev => ({ ...prev, [sessionId]: false }));
                            clearInterval(pollInterval);
                        } else if (data.status === 'CONNECTED') {
                            console.log(`[Dashboard] Session ${sessionId} is now CONNECTED`);
                            setQrLoading(prev => ({ ...prev, [sessionId]: false }));
                            clearInterval(pollInterval);
                            fetchSessions();
                        } else {
                            console.log(`[Dashboard] Waiting for QR (Attempt ${attempts})... Status: ${data.status}`);
                        }
                    }
                } catch (e) {
                    console.error(`[Dashboard] Polling error:`, e);
                }

                if (attempts >= 30) {
                    console.warn(`[Dashboard] QR polling timed out for ${sessionId}`);
                    setQrLoading(prev => ({ ...prev, [sessionId]: false }));
                    clearInterval(pollInterval);
                }
            }, 1000);

            fetchSessions();
        } catch (error) {
            console.error('[Dashboard] Error reconnecting:', error);
            alert('Error reconnecting');
            setQrLoading(prev => ({ ...prev, [sessionId]: false }));
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white">Device Manager</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage multiple WhatsApp sessions.</p>
                </div>

                {/* Simple create form */}
                <div className="flex gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <input
                        type="text"
                        placeholder="New Session Name (e.g. Work)"
                        className="bg-transparent px-3 py-1 outline-none text-sm w-48 text-black dark:text-white"
                        value={newSessionId}
                        onChange={(e) => setNewSessionId(e.target.value)}
                    />
                    <button
                        onClick={handleCreateSession}
                        disabled={!newSessionId || isCreating}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium transition disabled:opacity-50"
                    >
                        {isCreating ? 'Adding...' : '+ Add Device'}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                {loading && sessions.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        <div className="animate-spin inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mb-4"></div>
                        <p>Loading sessions...</p>
                    </div>
                )}

                {!loading && sessions.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700">
                        <p className="text-gray-500">No active sessions. Add one above!</p>
                    </div>
                )}

                {sessions.map(session => (
                    <div key={session.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="p-4 bg-gray-50 dark:bg-black/40 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white">{session.id}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${session.status === 'CONNECTED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {session.status}
                            </span>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[250px]">
                            {(() => {
                                if (session.status === 'CONNECTED') {
                                    return (
                                        <>
                                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <p className="text-center text-gray-500 text-sm mb-1">Connected Number</p>
                                            <p className="text-xl font-mono font-bold text-gray-800 dark:text-white mb-6">
                                                {session.user?.id?.split(':')[0] || 'Unknown'}
                                            </p>
                                        </>
                                    );
                                }
                                if (qrLoading[session.id]) {
                                    return (
                                        <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-4"></div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">Generating QR Code...</p>
                                            <p className="text-xs text-gray-400 mt-2">Please wait...</p>
                                        </div>
                                    );
                                }
                                if (qrCodes[session.id]) {
                                    return (
                                        <div className="flex flex-col items-center animate-in fade-in duration-500">
                                            <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm mb-4">
                                                <QRCodeCanvas value={qrCodes[session.id]} size={160} />
                                            </div>
                                            <p className="text-sm text-gray-500 text-center px-4">
                                                Scan this QR code with WhatsApp (Linked Devices)
                                            </p>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 mx-auto">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 mb-4">Click Connect to generate QR</p>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex gap-2">
                            {session.status === 'CONNECTED' ? (
                                <button
                                    onClick={() => handleDisconnect(session.id)}
                                    className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 py-2 rounded-lg text-sm font-medium transition border border-orange-500/30"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleReconnect(session.id)}
                                    disabled={qrLoading[session.id]}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${qrLoading[session.id]
                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                        }`}
                                >
                                    {(() => {
                                        if (qrLoading[session.id]) return 'Loading...';
                                        if (qrCodes[session.id]) return 'Refresh QR';
                                        return 'Connect';
                                    })()}
                                </button>
                            )}

                            <button
                                onClick={() => fetchSessions()}
                                className="px-3 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition"
                                title="Refresh Status"
                            >
                                ⟳
                            </button>

                            <button
                                onClick={() => handleDelete(session.id)}
                                className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition border border-red-200 dark:border-red-900/50"
                                title="Delete Session"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
