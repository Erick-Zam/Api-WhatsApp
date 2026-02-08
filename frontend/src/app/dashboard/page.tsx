'use client';

import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function Dashboard() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSessionId, setNewSessionId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});

    const fetchSessions = async () => {
        try {
            const res = await fetch('http://localhost:3001/sessions');
            const data = await res.json();
            setSessions(data);

            // Also fetch QR for any session that is connecting/disconnected
            data.forEach((s: any) => {
                if (s.status !== 'CONNECTED') {
                    fetchQr(s.id);
                }
            });
            setLoading(false);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            setLoading(false);
        }
    };

    const fetchQr = async (sessionId: string) => {
        try {
            const res = await fetch(`http://localhost:3001/qr?sessionId=${sessionId}`);
            const data = await res.json();
            if (data.qr) {
                setQrCodes(prev => ({ ...prev, [sessionId]: data.qr }));
            } else if (data.status === 'CONNECTED') {
                // If we thought it was needing QR but it's connected, refresh list
                fetchSessions();
            }
        } catch (error) {
            console.error(`Error fetching QR for ${sessionId}:`, error);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateSession = async () => {
        if (!newSessionId) return;
        setIsCreating(true);
        try {
            await fetch('http://localhost:3001/whatsapp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: newSessionId })
            });
            setNewSessionId('');
            fetchSessions();
        } catch (error) {
            alert('Error creating session');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDisconnect = async (sessionId: string) => {
        if (!confirm(`Disconnect session '${sessionId}'?`)) return;
        try {
            await fetch('http://localhost:3001/whatsapp/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            fetchSessions();
        } catch (error) {
            alert('Error disconnecting');
        }
    };

    const handleReconnect = async (sessionId: string) => {
        try {
            await fetch('http://localhost:3001/whatsapp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            fetchQr(sessionId);
            fetchSessions();
        } catch (error) {
            alert('Error reconnecting');
        }
    };

    return (
        <div>
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
                            {session.status === 'CONNECTED' ? (
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
                            ) : (
                                qrCodes[session.id] ? (
                                    <div className="flex flex-col items-center animate-in fade-in duration-500">
                                        <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm mb-4">
                                            <QRCodeCanvas value={qrCodes[session.id]} size={160} />
                                        </div>
                                        <p className="text-sm text-gray-500 text-center px-4">
                                            Scan this QR code with WhatsApp (Linked Devices)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 mx-auto">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 mb-4">Click Connect to generate QR</p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex gap-2">
                            {session.status === 'CONNECTED' ? (
                                <button
                                    onClick={() => handleDisconnect(session.id)}
                                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 py-2 rounded-lg text-sm font-medium transition border border-red-500/30"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleReconnect(session.id)}
                                    className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 py-2 rounded-lg text-sm font-medium transition border border-blue-500/30"
                                >
                                    {qrCodes[session.id] ? 'Refresh QR' : 'Connect'}
                                </button>
                            )}

                            <button
                                onClick={() => fetchSessions()}
                                className="px-3 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition"
                                title="Refresh Status"
                            >
                                ⟳
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
