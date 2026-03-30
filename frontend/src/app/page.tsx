'use client';
import { useEffect, useMemo, useState, SyntheticEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmailVerificationModal from '../components/EmailVerificationModal';

type AuthMode = 'login' | 'register' | 'mfa';

const AuthModal = ({
    mode,
    onClose,
    onSwitchMode,
    onRegistered,
}: {
    mode: AuthMode;
    onClose: () => void;
    onSwitchMode: (nextMode: AuthMode) => void;
    onRegistered: (email: string) => void;
}) => {
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

        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${apiBase}/auth/oauth/${provider}/url`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.url) {
            setError(data.error || `Unable to start ${provider} sign-in`);
            return;
        }

        window.location.href = data.url;
    };

    const handleLogin = async (e: SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
            const res = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: loginPassword, deviceFingerprint: getDeviceFingerprint() }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.requiresMfa) {
                    setMfaToken(data.mfaToken);
                    setMfaCode('');
                    onSwitchMode('mfa');
                    return;
                }

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
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Login failed');
            }
        } catch {
            setError('Error connecting to server');
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
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
            const res = await fetch(`${apiBase}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: registerEmail,
                    password: registerPassword,
                    username: registerUsername.trim(),
                }),
            });

            if (res.ok) {
                setSuccess('Account created. Check your email for verification.');
                onRegistered(registerEmail);
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Error connecting to server');
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
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
            const res = await fetch(`${apiBase}/auth/mfa/login-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mfaToken,
                    code: mfaCode,
                    trustDevice,
                    deviceFingerprint: getDeviceFingerprint(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
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
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Invalid MFA code');
            }
        } catch {
            setError('Error connecting to server');
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
                    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
                    {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}

                    {mode === 'login' && (
                        <>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Work email</span>
                                <input
                                    type="email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                                    placeholder="team@company.com"
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Password</span>
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                                    placeholder="Your password"
                                    required
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-bold text-zinc-950 transition hover:brightness-110 disabled:opacity-50"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-wide text-zinc-500">
                            <span className="h-px bg-zinc-800" />
                            Or continue with
                            <span className="h-px bg-zinc-800" />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            <button onClick={() => startOAuth('google')} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900">
                                Google
                            </button>
                            <button onClick={() => startOAuth('github')} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900">
                                GitHub
                            </button>
                        </div>

                        <p className="mt-6 text-center text-sm text-zinc-400">
                            New here?{' '}
                            <button onClick={() => onSwitchMode('register')} className="font-semibold text-cyan-300 hover:text-cyan-200">
                                Create account
                            </button>
                        </p>
                        </>
                    )}

                    {mode === 'register' && (
                        <>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Workspace name</span>
                                <input
                                    type="text"
                                    value={registerUsername}
                                    onChange={(e) => setRegisterUsername(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                                    placeholder="Acme Team"
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Email</span>
                                <input
                                    type="email"
                                    value={registerEmail}
                                    onChange={(e) => setRegisterEmail(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                                    placeholder="owner@company.com"
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Password</span>
                                <input
                                    type="password"
                                    value={registerPassword}
                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                                    placeholder="At least 8 characters"
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Confirm password</span>
                                <input
                                    type="password"
                                    value={registerPasswordConfirm}
                                    onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                                    placeholder="Repeat your password"
                                    required
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 font-bold text-zinc-950 transition hover:brightness-110 disabled:opacity-50"
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>

                        <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-wide text-zinc-500">
                            <span className="h-px bg-zinc-800" />
                            Or register with
                            <span className="h-px bg-zinc-800" />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            <button onClick={() => startOAuth('google')} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900">
                                Google
                            </button>
                            <button onClick={() => startOAuth('github')} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900">
                                GitHub
                            </button>
                        </div>

                        <p className="mt-6 text-center text-sm text-zinc-400">
                            Already have an account?{' '}
                            <button onClick={() => onSwitchMode('login')} className="font-semibold text-cyan-300 hover:text-cyan-200">
                                Sign in
                            </button>
                        </p>
                        </>
                    )}

                    {mode === 'mfa' && (
                        <form onSubmit={handleMfa} className="space-y-4">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Authenticator code</span>
                            <input
                                type="text"
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                                placeholder="123456"
                                required
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-bold text-zinc-950 transition hover:brightness-110 disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify and continue'}
                        </button>
                        <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                            <input
                                type="checkbox"
                                checked={trustDevice}
                                onChange={(e) => setTrustDevice(e.target.checked)}
                                className="h-4 w-4"
                            />
                            Trust this device for next logins
                        </label>
                        <button
                            type="button"
                            onClick={() => onSwitchMode('login')}
                            className="w-full rounded-xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
                        >
                            Back to sign in
                        </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function Home() {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [verificationEmail, setVerificationEmail] = useState('');
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const auth = params.get('auth');
        const token = params.get('token');
        const error = params.get('error') || params.get('verifyError');
        const verified = params.get('verified');

        if (token) {
            localStorage.setItem('token', token);
            router.push('/dashboard');
            return;
        }

        if (auth === 'login' || auth === 'register') {
            setAuthMode(auth);
            setModalOpen(true);
        }

        if (verified === 'true') {
            setAuthMode('login');
            setModalOpen(true);
        }

        if (error) {
            setAuthMode('login');
            setModalOpen(true);
        }
    }, [router]);

    const openModal = (mode: AuthMode) => {
        setAuthMode(mode);
        setModalOpen(true);
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#050913] text-white">
            {modalOpen && (
                <AuthModal
                    mode={authMode}
                    onClose={() => setModalOpen(false)}
                    onSwitchMode={setAuthMode}
                    onRegistered={(email) => {
                        setVerificationEmail(email);
                        setShowVerificationModal(true);
                    }}
                />
            )}
            {showVerificationModal && (
                <EmailVerificationModal
                    email={verificationEmail}
                    onClose={() => setShowVerificationModal(false)}
                />
            )}

            <div className="pointer-events-none absolute -left-24 top-[-80px] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="pointer-events-none absolute right-[-120px] top-44 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

            <section className="mx-auto max-w-6xl px-6 pb-20 pt-18 md:px-10 md:pt-24">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    WhatsApp Platform Suite
                </div>

                <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
                    Customer messaging,
                    <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent"> orchestrated at scale.</span>
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">
                    Deploy branded WhatsApp journeys, automate reminders, and monitor delivery in real time with a secure workspace built for teams.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                    <button onClick={() => openModal('login')} className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-7 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:brightness-110">
                        Enter platform
                    </button>
                    <button onClick={() => openModal('register')} className="rounded-full border border-zinc-700 bg-zinc-900/80 px-7 py-3 text-sm font-black uppercase tracking-wide text-zinc-100 transition hover:border-cyan-300/70 hover:bg-zinc-900">
                        Start free setup
                    </button>
                    <Link href="/docs" className="rounded-full border border-zinc-700 px-7 py-3 text-sm font-black uppercase tracking-wide text-zinc-300 transition hover:border-zinc-500 hover:text-white">
                        Technical docs
                    </Link>
                </div>
            </section>

            <section className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-3 md:px-10">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
                    <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Team Control</p>
                    <h3 className="mt-2 text-2xl font-bold">Role-based workspaces</h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">Separate operations, support, and growth teams while keeping credentials isolated and traceable.</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
                    <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Delivery Insights</p>
                    <h3 className="mt-2 text-2xl font-bold">Analytics in one stream</h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">Track sends, replies, and status updates with fast filtering across sessions and campaigns.</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
                    <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Automation Layer</p>
                    <h3 className="mt-2 text-2xl font-bold">Templates and scheduling</h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">Trigger campaigns automatically with reusable templates, jobs, and webhooks.</p>
                </div>
            </section>

            <section className="mx-auto mt-16 max-w-6xl px-6 pb-24 md:px-10">
                <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-8 md:p-10">
                    <div className="grid gap-8 md:grid-cols-2">
                        <div>
                            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Built for operations teams</p>
                            <h2 className="mt-2 text-3xl font-black">From onboarding to live broadcast in minutes.</h2>
                            <p className="mt-4 text-zinc-300">
                                Launch your first workflow, monitor key metrics, and keep complete audit visibility without sacrificing velocity.
                            </p>
                        </div>

                        <ul className="space-y-4 text-sm text-zinc-200">
                            <li className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4">Campaign templates with dynamic fields and reusable variables.</li>
                            <li className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4">Session-level API keys and granular permissions for each team.</li>
                            <li className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4">Security events and audit logs ready for compliance reviews.</li>
                        </ul>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button onClick={() => openModal('register')} className="rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-900 transition hover:bg-zinc-200">
                            Create account
                        </button>
                        <button onClick={() => openModal('login')} className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-100 transition hover:bg-zinc-900">
                            Sign in
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
