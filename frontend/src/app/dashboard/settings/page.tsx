'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface SettingsSession {
    id: string;
    status: string;
    apiKey?: string;
    engineType?: string;
    healthStatus?: string;
    lastHeartbeatAt?: string | null;
}

interface AvailableEngine {
    id: string;
    label: string;
    enabled: boolean;
    rollout?: number;
}

interface TrustedDevice {
    id: string;
    device_name: string;
    trusted_at: string;
    last_used_at: string;
}

interface MeUser {
    id: string;
    username: string;
    email: string;
    role: string;
    api_key: string;
    mfa_enabled: boolean;
    email_verified: boolean;
    has_password: boolean;
}

const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function SettingsPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<SettingsSession[]>([]);
    const [availableEngines, setAvailableEngines] = useState<AvailableEngine[]>([]);
    const [engineSavingSessionId, setEngineSavingSessionId] = useState('');
    const [engineMessage, setEngineMessage] = useState('');
    const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);

    const [user, setUser] = useState<MeUser | null>(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    const [editProfile, setEditProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setChangePasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [setPasswordValue, setSetPasswordValue] = useState('');
    const [setPasswordConfirm, setSetPasswordConfirm] = useState('');
    const [setPasswordFormLoading, setSetPasswordFormLoading] = useState(false);
    const [setPasswordMsg, setSetPasswordMsg] = useState('');

    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaSetupSecret, setMfaSetupSecret] = useState('');
    const [mfaSetupUri, setMfaSetupUri] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaLoading, setMfaLoading] = useState(false);
    const [mfaMessage, setMfaMessage] = useState('');
    const [mfaError, setMfaError] = useState('');

    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    });

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // no-op
        }
    };

    const fetchUserData = useCallback(async () => {
        if (!token) {
            router.replace('/?auth=login');
            return;
        }

        try {
            const [meRes, sessionsRes, trustedRes] = await Promise.all([
                fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiBase}/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiBase}/auth/mfa/trusted-devices`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const enginesRes = await fetch(`${apiBase}/sessions/available-engines`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!meRes.ok) {
                localStorage.removeItem('token');
                router.replace('/?auth=login');
                return;
            }

            const meData = await meRes.json();
            setUser(meData.user);
            setUsername(meData.user.username || '');
            setEmail(meData.user.email || '');
            setMfaEnabled(Boolean(meData.user.mfa_enabled));

            if (sessionsRes.ok) {
                const sessionsData = await sessionsRes.json();
                if (Array.isArray(sessionsData)) {
                    setSessions(sessionsData);
                }
            }

            if (trustedRes.ok) {
                const trustedData = await trustedRes.json();
                setTrustedDevices(trustedData.devices || []);
            }

            if (enginesRes.ok) {
                const enginesData = await enginesRes.json();
                if (Array.isArray(enginesData.engines)) {
                    setAvailableEngines(enginesData.engines);
                }
            }
        } catch {
            setProfileError('Unable to load settings.');
        } finally {
            setLoading(false);
        }
    }, [router, token]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleProfileUpdate = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');
        setProfileLoading(true);

        try {
            const res = await fetch(`${apiBase}/auth/profile`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ username, email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setProfileError(data.error || 'Failed to update profile');
            } else {
                setProfileSuccess('Profile updated successfully');
                setEditProfile(false);
                fetchUserData();
            }
        } catch {
            setProfileError('Unable to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords don't match");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        setChangePasswordLoading(true);
        try {
            const res = await fetch(`${apiBase}/auth/change-password`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setPasswordError(data.error || 'Failed to update password');
            } else {
                setPasswordSuccess('Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch {
            setPasswordError('Unable to update password');
        } finally {
            setChangePasswordLoading(false);
        }
    };

    const handleSetPassword = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSetPasswordMsg('');

        if (setPasswordValue.length < 8) {
            setSetPasswordMsg('Password must be at least 8 characters');
            return;
        }
        if (setPasswordValue !== setPasswordConfirm) {
            setSetPasswordMsg('Passwords do not match');
            return;
        }

        setSetPasswordFormLoading(true);
        try {
            const res = await fetch(`${apiBase}/auth/set-password`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ newPassword: setPasswordValue }),
            });
            const data = await res.json();
            if (!res.ok) {
                setSetPasswordMsg(data.error || 'Failed to set password');
            } else {
                setSetPasswordMsg('Password set successfully. You can now login with email + password.');
                setSetPasswordValue('');
                setSetPasswordConfirm('');
                fetchUserData();
            }
        } catch {
            setSetPasswordMsg('Unable to set password');
        } finally {
            setSetPasswordFormLoading(false);
        }
    };

    const sendVerificationEmail = async () => {
        setVerificationLoading(true);
        setVerificationMessage('');
        try {
            const res = await fetch(`${apiBase}/auth/send-verification-email`, {
                method: 'POST',
                headers: authHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                setVerificationMessage(data.error || 'Failed to send verification email');
            } else {
                setVerificationMessage('Verification email sent. Check inbox/spam.');
            }
        } catch {
            setVerificationMessage('Unable to send verification email');
        } finally {
            setVerificationLoading(false);
        }
    };

    const startMfaSetup = async () => {
        setMfaError('');
        setMfaMessage('');
        setMfaLoading(true);
        try {
            const res = await fetch(`${apiBase}/auth/mfa/setup`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) {
                setMfaError(data.error || 'Failed to start MFA setup');
            } else {
                setMfaSetupSecret(data.secret || '');
                setMfaSetupUri(data.otpauthUrl || '');
                setMfaMessage('Scan the QR and verify with your 6-digit code.');
            }
        } catch {
            setMfaError('Unable to start MFA setup');
        } finally {
            setMfaLoading(false);
        }
    };

    const verifyMfa = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMfaError('');
        setMfaMessage('');
        setMfaLoading(true);

        try {
            const res = await fetch(`${apiBase}/auth/mfa/verify`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ code: mfaCode }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMfaError(data.error || 'Failed to verify MFA code');
            } else {
                setMfaEnabled(true);
                setMfaCode('');
                setMfaSetupSecret('');
                setMfaSetupUri('');
                setMfaMessage('MFA enabled successfully');
                fetchUserData();
            }
        } catch {
            setMfaError('Unable to verify MFA');
        } finally {
            setMfaLoading(false);
        }
    };

    const disableMfa = async () => {
        if (!mfaCode) {
            setMfaError('Enter your current MFA code to disable MFA');
            return;
        }

        setMfaError('');
        setMfaMessage('');
        setMfaLoading(true);

        try {
            const res = await fetch(`${apiBase}/auth/mfa/disable`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ code: mfaCode }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMfaError(data.error || 'Failed to disable MFA');
            } else {
                setMfaEnabled(false);
                setMfaCode('');
                setMfaMessage('MFA disabled successfully');
                fetchUserData();
            }
        } catch {
            setMfaError('Unable to disable MFA');
        } finally {
            setMfaLoading(false);
        }
    };

    const removeTrusted = async (deviceId: string) => {
        try {
            await fetch(`${apiBase}/auth/mfa/trusted-devices/${deviceId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceId));
        } catch {
            // ignore
        }
    };

    const updateSessionEngine = async (sessionId: string, engineType: string) => {
        setEngineMessage('');
        setEngineSavingSessionId(sessionId);

        try {
            const res = await fetch(`${apiBase}/sessions/${encodeURIComponent(sessionId)}/engine`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ engineType, engineConfig: {} }),
            });
            const data = await res.json();

            if (!res.ok) {
                setEngineMessage(data.error || 'Failed to update engine');
                return;
            }

            setSessions((prev) => prev.map((session) => (
                session.id === sessionId
                    ? {
                        ...session,
                        engineType: data.config?.engineType || engineType,
                        healthStatus: data.config?.healthStatus || session.healthStatus,
                        lastHeartbeatAt: data.config?.lastHeartbeatAt || session.lastHeartbeatAt,
                    }
                    : session
            )));

            setEngineMessage(`Engine updated for session '${sessionId}'`);
        } catch {
            setEngineMessage('Unable to update engine');
        } finally {
            setEngineSavingSessionId('');
        }
    };

    if (loading) {
        return <div className="mx-auto max-w-4xl text-zinc-400">Loading settings...</div>;
    }

    return (
        <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-3xl font-bold text-black dark:text-white">Settings</h2>

            <div className="grid gap-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-3 text-lg font-bold text-gray-800 dark:text-white">Email Verification</h3>
                    <p className="mb-4 text-sm text-gray-500 dark:text-zinc-400">
                        Status:{' '}
                        <strong className={user?.email_verified ? 'text-emerald-500' : 'text-orange-500'}>
                            {user?.email_verified ? 'Verified' : 'Not verified'}
                        </strong>
                    </p>
                    {!user?.email_verified && (
                        <button
                            onClick={sendVerificationEmail}
                            disabled={verificationLoading}
                            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                        >
                            {verificationLoading ? 'Sending...' : 'Send verification email'}
                        </button>
                    )}
                    {verificationMessage && <p className="mt-3 text-sm text-zinc-400">{verificationMessage}</p>}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Profile</h3>
                        {!editProfile && (
                            <button className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => setEditProfile(true)}>
                                Edit
                            </button>
                        )}
                    </div>

                    {editProfile ? (
                        <form onSubmit={handleProfileUpdate} className="space-y-3">
                            <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" value={username} onChange={(e) => setUsername(e.target.value)} />
                            <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" value={email} onChange={(e) => setEmail(e.target.value)} />
                            {profileError && <p className="text-sm text-red-500">{profileError}</p>}
                            <div className="flex gap-2">
                                <button type="submit" disabled={profileLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                                    {profileLoading ? 'Saving...' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setEditProfile(false)} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                                <p className="text-xs text-zinc-400">Username</p>
                                <p className="font-semibold text-zinc-100">{user?.username}</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                                <p className="text-xs text-zinc-400">Email</p>
                                <p className="font-semibold text-zinc-100">{user?.email}</p>
                            </div>
                            {profileSuccess && <p className="text-sm text-emerald-500">{profileSuccess}</p>}
                        </div>
                    )}
                </div>

                {!user?.has_password && (
                    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6 dark:border-cyan-800/40 dark:bg-cyan-950/20">
                        <h3 className="mb-2 text-lg font-bold text-cyan-800 dark:text-cyan-200">Set Password (OAuth Account)</h3>
                        <p className="mb-4 text-sm text-cyan-700 dark:text-cyan-300">You signed up with social login. Set a password to also login with email/password.</p>
                        <form onSubmit={handleSetPassword} className="space-y-3">
                            <input
                                type="password"
                                placeholder="New password"
                                value={setPasswordValue}
                                onChange={(e) => setSetPasswordValue(e.target.value)}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                            />
                            <input
                                type="password"
                                placeholder="Confirm password"
                                value={setPasswordConfirm}
                                onChange={(e) => setSetPasswordConfirm(e.target.value)}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                            />
                            <button disabled={setPasswordFormLoading} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
                                {setPasswordFormLoading ? 'Saving...' : 'Set password'}
                            </button>
                            {setPasswordMsg && <p className="text-sm text-zinc-200">{setPasswordMsg}</p>}
                        </form>
                    </div>
                )}

                {user?.has_password && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Change Password</h3>
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                            <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
                            <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
                            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
                            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                            {passwordSuccess && <p className="text-sm text-emerald-500">{passwordSuccess}</p>}
                            <button disabled={passwordLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                                {passwordLoading ? 'Updating...' : 'Update password'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Multi-Factor Authentication</h3>
                    <p className="mb-4 text-sm text-zinc-400">
                        Status: <strong className={mfaEnabled ? 'text-emerald-500' : 'text-orange-500'}>{mfaEnabled ? 'Enabled' : 'Disabled'}</strong>
                    </p>

                    {!mfaEnabled && (
                        <button onClick={startMfaSetup} disabled={mfaLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                            {mfaLoading ? 'Generating...' : 'Start MFA setup'}
                        </button>
                    )}

                    {mfaSetupSecret && (
                        <div className="mt-4 grid gap-4 lg:grid-cols-[200px_1fr]">
                            <div className="rounded-lg border border-cyan-700/30 bg-white p-3">
                                {mfaSetupUri ? <QRCodeSVG value={mfaSetupUri} size={170} bgColor="#ffffff" fgColor="#111827" level="M" includeMargin /> : <p className="text-xs text-zinc-500">QR unavailable</p>}
                            </div>
                            <div className="space-y-3">
                                <div className="rounded-lg border border-cyan-700/30 bg-cyan-950/20 p-3">
                                    <p className="text-xs text-cyan-200">Manual secret</p>
                                    <p className="mt-1 break-all font-mono text-xs text-cyan-100">{mfaSetupSecret}</p>
                                    <button type="button" onClick={() => copyToClipboard(mfaSetupSecret)} className="mt-2 rounded bg-cyan-600 px-2 py-1 text-xs font-semibold text-white">
                                        Copy secret
                                    </button>
                                </div>
                                <form onSubmit={verifyMfa} className="space-y-2">
                                    <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit code" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
                                    <button disabled={mfaLoading} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Verify and enable</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {mfaEnabled && (
                        <div className="mt-4 space-y-3">
                            <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Current MFA code (for disable)" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
                            <button onClick={disableMfa} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">Disable MFA</button>
                        </div>
                    )}

                    {mfaMessage && <p className="mt-3 text-sm text-emerald-500">{mfaMessage}</p>}
                    {mfaError && <p className="mt-3 text-sm text-red-500">{mfaError}</p>}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Trusted Devices</h3>
                    {trustedDevices.length === 0 ? (
                        <p className="text-sm text-zinc-500">No trusted devices yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {trustedDevices.map((d) => (
                                <div key={d.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-200">{d.device_name || 'Device'}</p>
                                        <p className="text-xs text-zinc-500">Last used: {new Date(d.last_used_at).toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => removeTrusted(d.id)} className="rounded bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-600/30">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Session API Keys</h3>
                    {engineMessage && <p className="mb-3 text-sm text-cyan-400">{engineMessage}</p>}
                    {sessions.length === 0 ? (
                        <div className="text-sm text-zinc-500">
                            No active sessions found. <Link href="/dashboard" className="text-cyan-400">Connect a device</Link>.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((session) => (
                                <div key={session.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${session.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <p className="font-semibold text-zinc-100">{session.id}</p>
                                        <span className="text-xs text-zinc-500">{session.status}</span>
                                    </div>
                                    <div className="mb-3 grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
                                        <p className="text-xs text-zinc-400">API Engine</p>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const selectedEngine = session.engineType || 'baileys';
                                                const hasSelectedOption = availableEngines.some((engine) => engine.id === selectedEngine);
                                                const fallbackEngines: AvailableEngine[] = [
                                                    { id: 'baileys', label: 'Baileys (WebSocket)', enabled: true, rollout: 100 },
                                                    { id: 'puppeteer', label: 'Puppeteer (Browser)', enabled: false, rollout: 0 },
                                                ];
                                                const options = availableEngines.length > 0 ? availableEngines : fallbackEngines;

                                                return (
                                            <select
                                                value={selectedEngine}
                                                disabled={engineSavingSessionId === session.id}
                                                onChange={(e) => updateSessionEngine(session.id, e.target.value)}
                                                className="rounded border border-zinc-700 bg-black px-2 py-1 text-xs text-zinc-200"
                                            >
                                                {!hasSelectedOption && (
                                                    <option value={selectedEngine}>{selectedEngine} (current)</option>
                                                )}
                                                {options.map((engine) => (
                                                    <option key={engine.id} value={engine.id} disabled={!engine.enabled}>
                                                        {engine.label}{!engine.enabled ? ' (disabled)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                                );
                                            })()}
                                            <span className="text-xs text-zinc-500">Health: {session.healthStatus || 'unknown'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 rounded border border-zinc-700 bg-black p-2 font-mono text-xs text-zinc-300 break-all">
                                            {session.apiKey || 'No key'}
                                        </div>
                                        {session.apiKey && (
                                            <button onClick={() => copyToClipboard(session.apiKey || '')} className="rounded bg-zinc-800 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
