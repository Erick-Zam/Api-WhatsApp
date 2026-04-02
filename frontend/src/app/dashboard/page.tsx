'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Swal from 'sweetalert2';

const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#18181b',
    color: '#e4e4e7',
});

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
    const [newSessionEngine, setNewSessionEngine] = useState('baileys');
    const [isCreating, setIsCreating] = useState(false);
    const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
    const [availableEngines, setAvailableEngines] = useState<any[]>([]);
    const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
    const [qrLoading, setQrLoading] = useState<{ [key: string]: boolean }>({});
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const t = localStorage.getItem('token');
        if (t === null) {
            globalThis.location.href = '/?auth=login';
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
            globalThis.location.href = '/?auth=login';
            throw new Error('Unauthorized');
        }
        return res;
    }, [token]);

    const fetchEngines = useCallback(async () => {
        if (!token) return;
        try {
            const res = await authorizedFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/sessions/available-engines`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.engines) setAvailableEngines(data.engines);
            }
        } catch (error) {
            console.error('Error fetching engines:', error);
        }
    }, [token, authorizedFetch]);

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
            fetchEngines();
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
                body: JSON.stringify({ sessionId: newSessionId, engineType: newSessionEngine })
            });
            setNewSessionId('');
            setAddDeviceModalOpen(false);
            fetchSessions();
        } catch (err) {
            console.error('Error creating session:', err);
            toast.fire({ icon: 'error', title: 'Error creating session' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Are you sure you want to permanently delete session '${sessionId}'? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3f3f46',
            confirmButtonText: 'Yes, delete it!',
            background: '#18181b',
            color: '#e4e4e7'
        });
        if (!result.isConfirmed) return;
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
            toast.fire({ icon: 'error', title: 'Error deleting session' });
        }
    };

    const handleDisconnect = async (sessionId: string) => {
        const result = await Swal.fire({
            title: 'Disconnect Session?',
            text: `Are you sure you want to disconnect '${sessionId}'? You will need to scan the QR code to reconnect.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#eab308', // yellow-500
            cancelButtonColor: '#3f3f46',
            confirmButtonText: 'Disconnect',
            background: '#18181b',
            color: '#e4e4e7'
        });
        if (!result.isConfirmed) return;
        try {
            await authorizedFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/whatsapp/logout`, {
                method: 'POST',
                body: JSON.stringify({ sessionId })
            });
            fetchSessions();
        } catch (err) {
            console.error('Error disconnecting:', err);
            toast.fire({ icon: 'error', title: 'Error disconnecting' });
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
                toast.fire({ icon: 'error', title: 'Failed to start connection process' });
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
            toast.fire({ icon: 'error', title: 'Error reconnecting' });
            setQrLoading(prev => ({ ...prev, [sessionId]: false }));
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="theme-text-main text-3xl font-bold">Device Manager</h2>
                    <p className="theme-text-muted mt-1">Manage multiple WhatsApp sessions.</p>
                </div>

                {/* Add Device Button */}
                <div>
                    <button
                        onClick={() => setAddDeviceModalOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-lg shadow-green-500/20"
                    >
                        + Add Device
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                {loading && sessions.length === 0 && (
                    <div className="col-span-full py-12 text-center theme-text-muted">
                        <div className="animate-spin inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mb-4"></div>
                        <p>Loading sessions...</p>
                    </div>
                )}

                {!loading && sessions.length === 0 && (
                    <div className="col-span-full py-12 text-center theme-card-muted rounded-xl border border-dashed">
                        <p className="theme-text-muted">No active sessions. Add one above!</p>
                    </div>
                )}

                {sessions.map(session => (
                    <div key={session.id} className="theme-card rounded-xl overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="theme-card-strong p-4 border-b border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] flex justify-between items-center">
                            <h3 className="font-bold theme-text-main">{session.id}</h3>
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
                                            <p className="text-center theme-text-muted text-sm mb-1">Connected Number</p>
                                            <p className="text-xl font-mono font-bold theme-text-main mb-6">
                                                {session.user?.id?.split(':')[0] || 'Unknown'}
                                            </p>
                                        </>
                                    );
                                }
                                if (qrLoading[session.id]) {
                                    return (
                                        <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-4"></div>
                                            <p className="text-sm font-medium theme-text-muted animate-pulse">Generating QR Code...</p>
                                            <p className="text-xs theme-text-soft mt-2">Please wait...</p>
                                        </div>
                                    );
                                }
                                if (qrCodes[session.id]) {
                                    return (
                                        <div className="flex flex-col items-center animate-in fade-in duration-500">
                                            <div className="theme-card p-2 rounded-lg mb-4">
                                                <QRCodeCanvas value={qrCodes[session.id]} size={160} />
                                            </div>
                                            <p className="text-sm theme-text-muted text-center px-4">
                                                Scan this QR code with WhatsApp (Linked Devices)
                                            </p>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="text-center">
                                        <div className="w-16 h-16 theme-card-strong rounded-full flex items-center justify-center mb-4 mx-auto">
                                            <svg className="w-8 h-8 theme-text-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                        <p className="theme-text-muted mb-4">Click Connect to generate QR</p>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] theme-card-muted flex gap-2">
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
                                        ? 'theme-card-strong theme-text-soft cursor-not-allowed'
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
                                className="theme-button-secondary px-3 py-2 rounded-lg transition"
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

            {/* Add Device Modal */}
            {addDeviceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="theme-card-strong max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-[color:color-mix(in_srgb,var(--border-soft)_80%,transparent)]">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold theme-text-main">Add New Device</h3>
                            <button onClick={() => setAddDeviceModalOpen(false)} className="theme-text-muted hover:text-[color:var(--foreground)] transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block theme-text-soft text-sm font-semibold mb-1">Session Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sales, Marketing, Personal"
                                    className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                                    value={newSessionId}
                                    onChange={(e) => setNewSessionId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                                />
                                <p className="text-[11px] theme-text-muted mt-1">Only alphanumeric characters, dashes, and underscores.</p>
                            </div>

                            <div>
                                <label className="block theme-text-soft text-sm font-semibold mb-2">Select Engine</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {availableEngines.length > 0 ? availableEngines.map(engine => (
                                        <label 
                                            key={engine.id} 
                                            className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition ${newSessionEngine === engine.id ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'theme-card hover:border-[color:var(--border-soft)]'} ${!engine.enabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                        >
                                            <input 
                                                type="radio" 
                                                name="engineType" 
                                                value={engine.id} 
                                                disabled={!engine.enabled}
                                                checked={newSessionEngine === engine.id} 
                                                onChange={() => setNewSessionEngine(engine.id)}
                                                className="sr-only" 
                                            />
                                            <div className="flex flex-col h-full">
                                                <span className="font-semibold text-sm theme-text-main mb-1">
                                                    {engine.label.split(' ')[0]} 
                                                    {engine.id === 'baileys' && <span className="ml-1 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wide">Rec</span>}
                                                </span>
                                                <span className="text-[11px] theme-text-soft leading-tight">
                                                    {engine.id === 'baileys' ? 'WebSocket based. Ultra fast and low CPU/RAM usage.' : 'Browser based. High compatibility for edge features.'}
                                                </span>
                                            </div>
                                            {!engine.enabled && (
                                                <div className="absolute top-2 right-2 flex h-2 w-2">
                                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                                                </div>
                                            )}
                                        </label>
                                    )) : (
                                        <p className="col-span-2 text-sm theme-text-soft">Loading engines...</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button 
                                onClick={() => setAddDeviceModalOpen(false)}
                                className="px-5 py-2 rounded-xl text-sm font-semibold theme-text-muted hover:bg-[color:var(--surface-muted)] transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateSession}
                                disabled={!newSessionId || isCreating}
                                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 transition shadow-[0_0_15px_rgba(22,163,74,0.3)] disabled:opacity-50"
                            >
                                {isCreating ? 'Creating...' : 'Create Device'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
