'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthModal, { type AuthMode } from '../components/AuthModal';
import EmailVerificationModal from '../components/EmailVerificationModal';

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
