import Link from 'next/link';

export default function Docs() {
    return (
        <div className="min-h-screen p-8 font-sans theme-text-main md:p-16">
            <header className="mb-16 flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--border-soft)_82%,transparent)] pb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        WhatsApp SaaS Documentation
                    </h1>
                    <p className="theme-text-muted mt-2 text-lg">Platform Overview & Getting Started</p>
                </div>
                <Link
                    href="/"
                    className="theme-button-secondary rounded-lg px-6 py-2 text-sm transition"
                >
                    ← Back to Home
                </Link>
            </header>

            <div className="grid md:grid-cols-4 gap-12 max-w-7xl mx-auto">

                {/* Sidebar Navigation */}
                <aside className="md:col-span-1 space-y-8 sticky top-8">
                    <div>
                        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider theme-text-main">Getting Started</h3>
                        <ul className="theme-text-muted space-y-3 border-l border-[color:color-mix(in_srgb,var(--border-soft)_82%,transparent)] pl-4">
                            <li><a href="#intro" className="transition hover:text-[color:var(--accent)]">Introduction</a></li>
                            <li><a href="#quickstart" className="transition hover:text-[color:var(--accent)]">Quick Start</a></li>
                            <li><a href="#authentication" className="transition hover:text-[color:var(--accent)]">Authentication</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider theme-text-main">Core Concepts</h3>
                        <ul className="theme-text-muted space-y-3 border-l border-[color:color-mix(in_srgb,var(--border-soft)_82%,transparent)] pl-4">
                            <li><a href="#sessions" className="transition hover:text-[color:var(--accent)]">Sessions</a></li>
                            <li><a href="#webhooks" className="transition hover:text-[color:var(--accent)]">Webhooks</a></li>
                            <li><a href="#rate-limits" className="transition hover:text-[color:var(--accent)]">Rate Limits</a></li>
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="md:col-span-3 space-y-16">

                    <section id="intro">
                        <h2 className="mb-6 text-3xl font-bold theme-text-main">Introduction</h2>
                        <p className="theme-text-muted mb-4 leading-relaxed">
                            Welcome to the WhatsApp API SaaS documentation. Our platform provides a robust, RESTful API to programmatically interact with WhatsApp.
                            Built on top of the powerful <code className="theme-code-block rounded px-1 py-0.5 text-[color:var(--accent)]">Baileys</code> library, we offer a multi-session architecture that allows you to manage hundreds of WhatsApp numbers from a single dashboard.
                        </p>
                        <div className="theme-card rounded-xl p-6">
                            <h4 className="mb-2 font-bold theme-text-main">Key Capabilities</h4>
                            <ul className="theme-text-muted list-inside list-disc space-y-2">
                                <li>Send Text, Images, Videos, Audio, and Documents.</li>
                                <li>Create and manage Groups.</li>
                                <li>Real-time event notifications via Webhooks.</li>
                                <li>Interactive Polls and Location sharing.</li>
                            </ul>
                        </div>
                    </section>

                    <section id="quickstart">
                        <h2 className="mb-6 text-3xl font-bold theme-text-main">Quick Start</h2>
                        <ol className="theme-text-muted list-inside list-decimal space-y-6">
                            <li className="pl-2">
                                <strong className="theme-text-main">Create an Account:</strong> Register on the platform to get your main API Access.
                            </li>
                            <li className="pl-2">
                                <strong className="theme-text-main">Start a Session:</strong> Go to the Dashboard and click <span className="text-[color:var(--accent-strong)]">Add Device</span>. Give it a name (e.g., &quot;Support-Bot&quot;).
                            </li>
                            <li className="pl-2">
                                <strong className="theme-text-main">Scan QR Code:</strong> Click &quot;Connect&quot; and scan the QR code with your WhatsApp mobile app (Linked Devices).
                            </li>
                            <li className="pl-2">
                                <strong className="theme-text-main">Get API Key:</strong> Once connected, the dashboard will reveal your unique <code className="theme-code-block rounded px-1 py-0.5">x-api-key</code> for that session.
                            </li>
                        </ol>
                    </section>

                    <section id="authentication">
                        <h2 className="mb-6 text-3xl font-bold theme-text-main">Authentication</h2>
                        <p className="theme-text-muted mb-4">
                            All API requests require authentication. We use header-based authentication.
                        </p>
                        <div className="theme-code-block overflow-x-auto rounded-lg p-4 font-mono text-sm">
                            <span className="text-purple-400">x-api-key</span>: <span className="text-green-400">your_session_api_key</span>
                        </div>
                        <p className="theme-text-soft mt-4 text-sm">
                            For Dashboard-related actions (creating sessions, etc.), we use standard JWT Bearer tokens which are handled automatically by the frontend.
                        </p>
                    </section>

                    <section id="sessions">
                        <h2 className="mb-6 text-3xl font-bold theme-text-main">Sessions</h2>
                        <p className="theme-text-muted">
                            A <strong>Session</strong> represents a single connected WhatsApp phone number. Each session runs in isolation, meaning actions on one session do not affect others.
                            You can indefinitely scale the number of sessions based on your server capacity.
                        </p>
                    </section>

                    <section id="apidocs">
                        <h2 className="mb-6 text-3xl font-bold theme-text-main">Full API Reference</h2>
                        <p className="theme-text-muted mb-6">
                            For detailed endpoint documentation, request examples, and response schemas, please visit our interactive API Playground and Reference inside the Dashboard.
                        </p>
                        <Link
                            href="/dashboard/docs"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition"
                        >
                            Go to API Reference →
                        </Link>
                    </section>

                </main>
            </div>
        </div>
    );
}
