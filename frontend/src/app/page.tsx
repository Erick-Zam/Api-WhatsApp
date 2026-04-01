'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthModal, { type AuthMode } from '../components/AuthModal';
import EmailVerificationModal from '../components/EmailVerificationModal';

export default function Home() {
    const router = useRouter();
    const getInitialUiState = () => {
        if (typeof window === 'undefined') {
            return { modalOpen: false, authMode: 'login' as AuthMode };
        }

        const params = new URLSearchParams(window.location.search);
        const auth = params.get('auth');
        const error = params.get('error') || params.get('verifyError');
        const verified = params.get('verified');

        if (auth === 'login' || auth === 'register') {
            return { modalOpen: true, authMode: auth as AuthMode };
        }

        if (verified === 'true' || error) {
            return { modalOpen: true, authMode: 'login' as AuthMode };
        }

        return { modalOpen: false, authMode: 'login' as AuthMode };
    };

    const [initialUiState] = useState(getInitialUiState);
    const [modalOpen, setModalOpen] = useState(initialUiState.modalOpen);
    const [authMode, setAuthMode] = useState<AuthMode>(initialUiState.authMode);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('token', token);
            router.push('/dashboard');
        }
    }, [router]);

    const openModal = (mode: AuthMode) => {
        setAuthMode(mode);
        setModalOpen(true);
    };

    return (
        <main className="relative min-h-screen overflow-hidden theme-text-main">
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
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--accent-strong)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                    WhatsApp Platform Suite
                </div>

                <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
                    Customer messaging,
                    <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent"> orchestrated at scale.</span>
                </h1>

                <p className="theme-text-muted mt-6 max-w-2xl text-lg leading-relaxed">
                    Deploy branded WhatsApp journeys, automate reminders, and monitor delivery in real time with a secure workspace built for teams.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                    <button onClick={() => openModal('login')} className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-7 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:brightness-110">
                        Enter platform
                    </button>
                    <button onClick={() => openModal('register')} className="theme-button-secondary rounded-full px-7 py-3 text-sm font-black uppercase tracking-wide transition hover:border-[color:color-mix(in_srgb,var(--accent-strong)_45%,var(--border-soft))]">
                        Start free setup
                    </button>
                    <Link href="/docs" className="theme-button-secondary rounded-full px-7 py-3 text-sm font-black uppercase tracking-wide transition hover:border-[color:color-mix(in_srgb,var(--accent-strong)_45%,var(--border-soft))]">
                        Technical docs
                    </Link>
                </div>
            </section>

            <section className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-3 md:px-10">
                <div className="theme-card rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--accent-strong)]">Team Control</p>
                    <h3 className="mt-2 text-2xl font-bold">Role-based workspaces</h3>
                    <p className="theme-text-muted mt-3 text-sm leading-relaxed">Separate operations, support, and growth teams while keeping credentials isolated and traceable.</p>
                </div>
                <div className="theme-card rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--accent-strong)]">Delivery Insights</p>
                    <h3 className="mt-2 text-2xl font-bold">Analytics in one stream</h3>
                    <p className="theme-text-muted mt-3 text-sm leading-relaxed">Track sends, replies, and status updates with fast filtering across sessions and campaigns.</p>
                </div>
                <div className="theme-card rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--accent-strong)]">Automation Layer</p>
                    <h3 className="mt-2 text-2xl font-bold">Templates and scheduling</h3>
                    <p className="theme-text-muted mt-3 text-sm leading-relaxed">Trigger campaigns automatically with reusable templates, jobs, and webhooks.</p>
                </div>
            </section>

            <section className="mx-auto mt-16 max-w-6xl px-6 pb-24 md:px-10">
                <div className="theme-hero-surface rounded-3xl p-8 md:p-10">
                    <div className="grid gap-8 md:grid-cols-2">
                        <div>
                            <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--accent-strong)]">Built for operations teams</p>
                            <h2 className="mt-2 text-3xl font-black">From onboarding to live broadcast in minutes.</h2>
                            <p className="theme-text-muted mt-4">
                                Launch your first workflow, monitor key metrics, and keep complete audit visibility without sacrificing velocity.
                            </p>
                        </div>

                        <ul className="space-y-4 text-sm theme-text-main">
                            <li className="theme-card-muted rounded-xl p-4">Campaign templates with dynamic fields and reusable variables.</li>
                            <li className="theme-card-muted rounded-xl p-4">Session-level API keys and granular permissions for each team.</li>
                            <li className="theme-card-muted rounded-xl p-4">Security events and audit logs ready for compliance reviews.</li>
                        </ul>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button onClick={() => openModal('register')} className="rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-900 transition hover:bg-zinc-200">
                            Create account
                        </button>
                        <button onClick={() => openModal('login')} className="theme-button-secondary rounded-full px-6 py-3 text-sm font-black uppercase tracking-wide transition hover:border-[color:color-mix(in_srgb,var(--accent-strong)_45%,var(--border-soft))]">
                            Sign in
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
