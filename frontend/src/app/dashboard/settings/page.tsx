'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords don't match");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            return;
        }

        setPasswordLoading(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch('http://localhost:3001/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                setPasswordSuccess('Password updated successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setPasswordError(data.error || 'Failed to update password');
            }
        } catch (err) {
            setPasswordError('An error occurred. Please try again.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const fetchUserData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            // Fetch User Profile
            const resUser = await fetch('http://localhost:3001/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (resUser.ok) {
                const data = await resUser.json();
                setUsername(data.user.username);
                setEmail(data.user.email);
            } else {
                localStorage.removeItem('token');
                router.push('/login');
                return;
            }

            // Fetch Sessions
            const resSessions = await fetch('http://localhost:3001/sessions');
            if (resSessions.ok) {
                const sessionData = await resSessions.json();
                setSessions(sessionData);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [router]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied!');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-black dark:text-white">Settings</h2>

            <div className="grid gap-8">
                {/* Profile Card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <span>👤</span> Profile Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Username</label>
                            <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{username}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                            <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{email}</p>
                        </div>
                    </div>
                </div>

                {/* Change Password Card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <span>🔒</span> Change Password
                    </h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>
                        </div>

                        {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                        {passwordSuccess && <p className="text-green-500 text-sm">{passwordSuccess}</p>}

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={passwordLoading}
                                className={`px-6 py-2 rounded-lg font-bold text-white transition ${passwordLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-500/20'
                                    }`}
                            >
                                {passwordLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* API & Sessions Configuration */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <span>🔑</span> Session API Keys
                    </h3>

                    {loading ? (
                        <p className="text-gray-500">Loading sessions...</p>
                    ) : sessions.length > 0 ? (
                        <div className="space-y-6">
                            {sessions.map((session) => (
                                <div key={session.id} className="border border-gray-100 dark:border-zinc-800 rounded-lg p-6 bg-gray-50/50 dark:bg-zinc-950/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${session.status === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">{session.id}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${session.status === 'CONNECTED'
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                {session.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">API Key</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-white dark:bg-black p-3 rounded border border-gray-200 dark:border-zinc-700 font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
                                                {session.apiKey || 'No Key Generated'}
                                            </div>
                                            {session.apiKey && (
                                                <button
                                                    onClick={() => copyToClipboard(session.apiKey)}
                                                    className="bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 px-4 py-2 rounded text-gray-700 dark:text-white transition font-medium text-sm"
                                                >
                                                    Copy
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">No active sessions found.</p>
                            <Link
                                href="/dashboard"
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition inline-block text-sm"
                            >
                                Connect a Device
                            </Link>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
                        <p className="text-xs text-gray-400">
                            Use these keys in the <code className="text-purple-400">x-api-key</code> header to specify which session (device) to use for sending messages.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
