'use client';
import type { SyntheticEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SettingsSession {
    id: string;
    status: string;
    apiKey?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const isConnected = status === 'CONNECTED';
    return (
        <span className={`text-xs px-2 py-0.5 rounded border ${isConnected
            ? 'bg-green-500/10 text-green-500 border-green-500/20'
            : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}>
            {status}
        </span>
    );
};

export default function SettingsPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [sessions, setSessions] = useState<SettingsSession[]>([]);
    const [loading, setLoading] = useState(true);

    // Profile Edit State
    const [editProfile, setEditProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // MFA State
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaSetupSecret, setMfaSetupSecret] = useState('');
    const [mfaSetupUri, setMfaSetupUri] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaLoading, setMfaLoading] = useState(false);
    const [mfaMessage, setMfaMessage] = useState('');
    const [mfaError, setMfaError] = useState('');

    const handlePasswordChange = async (e: SyntheticEvent<HTMLFormElement>) => {
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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/change-password`, {
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
            console.error('Password change error:', err);
            setPasswordError('An error occurred. Please try again.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleProfileUpdate = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');
        setProfileLoading(true);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, email })
            });

            const data = await res.json();
            if (res.ok) {
                setProfileSuccess('Profile updated successfully!');
                setEditProfile(false);
            } else {
                setProfileError(data.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setProfileError('An error occurred. Please try again.');
        } finally {
            setProfileLoading(false);
        }
    };

    const fetchUserData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            // Fetch User Profile
            const resUser = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (resUser.ok) {
                const data = await resUser.json();
                setUsername(data.user.username);
                setEmail(data.user.email);
                setMfaEnabled(Boolean(data.user.mfa_enabled));
            } else {
                localStorage.removeItem('token');
                router.push('/login');
                return;
            }

            const mfaStatusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/mfa/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (mfaStatusRes.ok) {
                const mfaStatusData = await mfaStatusRes.json();
                setMfaEnabled(Boolean(mfaStatusData.enabled));
            }

            // Fetch Sessions
            const resSessions = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (resSessions.ok) {
                const sessionData = await resSessions.json();
                setSessions(sessionData);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied!');
    };

    const startMfaSetup = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setMfaError('');
        setMfaMessage('');
        setMfaLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/mfa/setup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to initialize MFA setup');
            }

            setMfaSetupSecret(data.secret || '');
            setMfaSetupUri(data.otpauthUrl || '');
            setMfaMessage('MFA secret generated. Add it to your authenticator app and verify with a code.');
        } catch (err) {
            setMfaError(err instanceof Error ? err.message : 'Failed to start MFA setup');
        } finally {
            setMfaLoading(false);
        }
    };

    const verifyMfa = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return;

        setMfaError('');
        setMfaMessage('');
        setMfaLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/mfa/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ code: mfaCode })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to verify MFA code');
            }

            setMfaEnabled(true);
            setMfaCode('');
            setMfaSetupSecret('');
            setMfaSetupUri('');
            setMfaMessage('MFA enabled successfully.');
        } catch (err) {
            setMfaError(err instanceof Error ? err.message : 'Failed to verify MFA');
        } finally {
            setMfaLoading(false);
        }
    };

    const disableMfaAction = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        if (!mfaCode) {
            setMfaError('Enter current MFA code to disable MFA.');
            return;
        }

        setMfaError('');
        setMfaMessage('');
        setMfaLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/mfa/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ code: mfaCode })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to disable MFA');
            }

            setMfaEnabled(false);
            setMfaCode('');
            setMfaMessage('MFA disabled successfully.');
        } catch (err) {
            setMfaError(err instanceof Error ? err.message : 'Failed to disable MFA');
        } finally {
            setMfaLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-black dark:text-white">Settings</h2>

            <div className="grid gap-8">
                {/* Profile Card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span>👤</span> Profile Information
                        </h3>
                        {!editProfile && (
                            <button
                                onClick={() => setEditProfile(true)}
                                className="text-sm font-bold text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg transition"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {editProfile ? (
                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" htmlFor="username">Username</label>
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" htmlFor="email">Email Address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                        required
                                    />
                                </div>
                            </div>
                            {profileError && <p className="text-red-500 text-sm">{profileError}</p>}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditProfile(false);
                                        fetchUserData(); // Reset to current data
                                    }}
                                    className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition shadow-lg hover:shadow-green-500/20 disabled:opacity-50"
                                >
                                    {profileLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Username</span>
                                    <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{username}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</span>
                                    <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{email}</p>
                                </div>
                            </div>
                            {profileSuccess && <p className="mt-4 text-green-500 text-sm font-medium">✓ {profileSuccess}</p>}
                        </div>
                    )}
                </div>

                {/* Change Password Card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <span>🔒</span> Change Password
                    </h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" htmlFor="currentPassword">Current Password</label>
                                <input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                    placeholder="Enter current password"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" htmlFor="newPassword">New Password</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                    placeholder="Enter new password"
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                    placeholder="Confirm new password"
                                    required
                                    autoComplete="new-password"
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

                    {(() => {
                        if (loading) {
                            return <p className="text-gray-500">Loading sessions...</p>;
                        }
                        
                        if (sessions.length > 0) {
                            return (
                                <div className="space-y-6">
                                    {sessions.map((session) => (
                                        <div key={session.id} className="border border-gray-100 dark:border-zinc-800 rounded-lg p-6 bg-gray-50/50 dark:bg-zinc-950/50">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${session.status === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">{session.id}</h4>
                                                    <StatusBadge status={session.status} />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" htmlFor={`api-key-${session.id}`}>API Key</label>
                                                <div className="flex gap-2">
                                                    <div id={`api-key-${session.id}`} className="flex-1 bg-white dark:bg-black p-3 rounded border border-gray-200 dark:border-zinc-700 font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
                                                        {session.apiKey || 'No Key Generated'}
                                                    </div>
                                                    {session.apiKey && (
                                                        <button
                                                            onClick={() => copyToClipboard(session.apiKey || '')}
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
                            );
                        }

                        return (
                            <div className="text-center py-8">
                                <p className="text-gray-500 mb-4">No active sessions found.</p>
                                <Link
                                    href="/dashboard"
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition inline-block text-sm"
                                >
                                    Connect a Device
                                </Link>
                            </div>
                        );
                    })()}

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
                        <p className="text-xs text-gray-400">
                            Use these keys in the <code className="text-purple-400">x-api-key</code> header to specify which session (device) to use for sending messages.
                        </p>
                    </div>
                </div>

                {/* MFA Configuration */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <span>🛡️</span> Multi-Factor Authentication
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Status: <strong className={mfaEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{mfaEnabled ? 'Enabled' : 'Disabled'}</strong>
                    </p>

                    {!mfaEnabled && (
                        <button
                            onClick={startMfaSetup}
                            disabled={mfaLoading}
                            className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition disabled:opacity-50"
                        >
                            {mfaLoading ? 'Generating...' : 'Start MFA Setup'}
                        </button>
                    )}

                    {mfaSetupSecret && (
                        <div className="mt-4 p-4 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40">
                            <p className="text-sm mb-2 text-amber-900 dark:text-amber-200">Add this secret to your authenticator app:</p>
                            <div className="font-mono text-xs break-all text-amber-900 dark:text-amber-100">{mfaSetupSecret}</div>
                            {mfaSetupUri && (
                                <p className="text-xs mt-2 text-amber-700 dark:text-amber-300 break-all">{mfaSetupUri}</p>
                            )}
                        </div>
                    )}

                    <form onSubmit={verifyMfa} className="mt-4 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" htmlFor="mfaCode">Authenticator Code</label>
                            <input
                                id="mfaCode"
                                type="text"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                className="w-full md:w-64 bg-gray-50 dark:bg-black/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-green-500 text-gray-800 dark:text-gray-200"
                                placeholder="123456"
                            />
                        </div>

                        <div className="flex gap-3">
                            {!mfaEnabled && (
                                <button
                                    type="submit"
                                    disabled={mfaLoading || !mfaCode}
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition disabled:opacity-50"
                                >
                                    Verify and Enable
                                </button>
                            )}

                            {mfaEnabled && (
                                <button
                                    type="button"
                                    onClick={disableMfaAction}
                                    disabled={mfaLoading}
                                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition disabled:opacity-50"
                                >
                                    Disable MFA
                                </button>
                            )}
                        </div>
                    </form>

                    {mfaMessage && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{mfaMessage}</p>}
                    {mfaError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{mfaError}</p>}
                </div>
            </div>
        </div>
    );
}
