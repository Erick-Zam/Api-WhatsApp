'use client';

import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiRequestNoAuth } from '@/lib/api/client';
import Alert from '@/components/ui/Alert';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import MfaForm from '@/components/auth/MfaForm';

export type AuthMode = 'login' | 'register' | 'mfa';

interface AuthModalProps {
    mode: AuthMode;
    onClose: () => void;
    onSwitchMode: (nextMode: AuthMode) => void;
    onRegistered: (email: string) => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode, onRegistered }: AuthModalProps) {
    const router = useRouter();
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerUsername, setRegisterUsername] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaToken, setMfaToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [trustDevice, setTrustDevice] = useState(true);

    const getDeviceFingerprint = () => {
        if (typeof window === 'undefined') return '';
        const ua = navigator.userAgent || '';
        const lang = navigator.language || '';
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const raw = `${ua}|${lang}|${tz}`;
        return btoa(raw).slice(0, 120);
    };

    const title = useMemo(() => {
        if (mode === 'register') return 'Create your workspace';
        if (mode === 'mfa') return 'Secure verification';
        return 'Welcome back';
    }, [mode]);

    const subtitle = useMemo(() => {
        if (mode === 'register') return 'Start sending WhatsApp campaigns with enterprise-grade control.';
        if (mode === 'mfa') return 'Enter your 6-digit code to finish signing in.';
        return 'Access your dashboard, sessions, and delivery analytics.';
    }, [mode]);

    const startOAuth = async (provider: 'google' | 'github') => {
        setError('');
        setSuccess('');

        try {
            const data = await apiRequestNoAuth<{ url: string }>(`/auth/oauth/${provider}/url`);
            if (!data.url) {
                setError(`Unable to start ${provider} sign-in`);
                return;
            }
            window.location.href = data.url;
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
                return;
            }
            setError(`Unable to start ${provider} sign-in`);
        }
    };

    const handleLogin = async (e: SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const data = await apiRequestNoAuth<{
                token?: string;
                requiresMfa?: boolean;
                mfaToken?: string;
                recommendMfa?: boolean;
                user?: { email_verified?: boolean };
            }>('/auth/login', {
                method: 'POST',
                body: { email: loginEmail, password: loginPassword, deviceFingerprint: getDeviceFingerprint() },
            });

            if (data.requiresMfa) {
                setMfaToken(data.mfaToken || '');
                setMfaCode('');
                onSwitchMode('mfa');
                return;
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                const notices: string[] = [];
                if (data.recommendMfa) {
                    localStorage.setItem('recommendMfa', 'true');
                    notices.push('Security tip: enable MFA in Settings to better protect your account.');
                }
                if (data.user?.email_verified === false) {
                    notices.push('Your email is not verified yet. You can continue now and verify later from Settings.');
                }

                if (notices.length > 0) {
                    setSuccess(notices.join(' '));
                    setTimeout(() => router.push('/dashboard'), 1200);
                } else {
                    router.push('/dashboard');
                }
            } else {
                setError('Login failed');
            }
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Error connecting to server');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (registerPassword.length < 8) {
            setLoading(false);
            setError('Password must have at least 8 characters');
            return;
        }

        if (registerPassword !== registerPasswordConfirm) {
            setLoading(false);
            setError('Passwords do not match');
            return;
        }

        if (registerUsername.trim().length < 3) {
            setLoading(false);
            setError('Username must have at least 3 characters');
            return;
        }

        try {
            await apiRequestNoAuth<{ message: string }>('/auth/register', {
                method: 'POST',
                body: {
                    email: registerEmail,
                    password: registerPassword,
                    username: registerUsername.trim(),
                },
            });

            setSuccess('Account created. Check your email for verification.');
            onRegistered(registerEmail);
            onClose();
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Error connecting to server');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMfa = async (e: SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const data = await apiRequestNoAuth<{
                token?: string;
                recommendMfa?: boolean;
                user?: { email_verified?: boolean };
            }>('/auth/mfa/login-verify', {
                method: 'POST',
                body: {
                    mfaToken,
                    code: mfaCode,
                    trustDevice,
                    deviceFingerprint: getDeviceFingerprint(),
                },
            });

            if (data.token) {
                localStorage.setItem('token', data.token);
                const notices: string[] = [];
                if (data.recommendMfa) {
                    localStorage.setItem('recommendMfa', 'true');
                    notices.push('Security tip: enable MFA in Settings to better protect your account.');
                }
                if (data.user?.email_verified === false) {
                    notices.push('Your email is not verified yet. You can continue now and verify later from Settings.');
                }

                if (notices.length > 0) {
                    setSuccess(notices.join(' '));
                    setTimeout(() => router.push('/dashboard'), 1200);
                } else {
                    router.push('/dashboard');
                }
            } else {
                setError('Invalid MFA code');
            }
        } catch (requestError) {
            if (requestError instanceof ApiError) {
                setError(requestError.message);
            } else {
                setError('Error connecting to server');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-4 bg-black/65 backdrop-blur-md">
            <button
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0"
            />
            <div className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-zinc-950/90 shadow-[0_24px_90px_rgba(0,0,0,0.65)]">
                <div className="border-b border-zinc-800/80 px-6 pb-4 pt-6 sm:px-8 sm:pt-7">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">Access Portal</p>
                    <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{title}</h2>
                    <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:text-white">
                        Close
                    </button>
                </div>

                <div className="modal-scroll min-h-0 space-y-5 overflow-y-auto px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
                    {error && <Alert tone="error">{error}</Alert>}
                    {success && <Alert tone="success">{success}</Alert>}

                    {mode === 'login' && (
                        <LoginForm
                            loading={loading}
                            loginEmail={loginEmail}
                            loginPassword={loginPassword}
                            onSubmit={handleLogin}
                            onEmailChange={setLoginEmail}
                            onPasswordChange={setLoginPassword}
                            onOAuth={startOAuth}
                            onSwitchToRegister={() => onSwitchMode('register')}
                        />
                    )}

                    {mode === 'register' && (
                        <RegisterForm
                            loading={loading}
                            registerUsername={registerUsername}
                            registerEmail={registerEmail}
                            registerPassword={registerPassword}
                            registerPasswordConfirm={registerPasswordConfirm}
                            onSubmit={handleRegister}
                            onUsernameChange={setRegisterUsername}
                            onEmailChange={setRegisterEmail}
                            onPasswordChange={setRegisterPassword}
                            onPasswordConfirmChange={setRegisterPasswordConfirm}
                            onOAuth={startOAuth}
                            onSwitchToLogin={() => onSwitchMode('login')}
                        />
                    )}

                    {mode === 'mfa' && (
                        <MfaForm
                            loading={loading}
                            mfaCode={mfaCode}
                            trustDevice={trustDevice}
                            onSubmit={handleMfa}
                            onCodeChange={setMfaCode}
                            onTrustDeviceChange={setTrustDevice}
                            onBackToLogin={() => onSwitchMode('login')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
