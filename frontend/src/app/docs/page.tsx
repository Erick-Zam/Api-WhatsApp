import Link from 'next/link';

export default function Docs() {
    return (
        <div className="min-h-screen bg-black text-white p-8 md:p-16 font-sans">
            <header className="flex justify-between items-center mb-16 border-b border-zinc-800 pb-8">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        WhatsApp SaaS Documentation
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">Platform Overview & Getting Started</p>
                </div>
                <Link
                    href="/"
                    className="px-6 py-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition border border-zinc-800 text-sm"
                >
                    ← Back to Home
                </Link>
            </header>

            <div className="grid md:grid-cols-4 gap-12 max-w-7xl mx-auto">

                {/* Sidebar Navigation */}
                <aside className="md:col-span-1 space-y-8 sticky top-8">
                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-4">Getting Started</h3>
                        <ul className="space-y-3 text-gray-400 border-l border-zinc-800 pl-4">
                            <li><a href="#intro" className="hover:text-green-400 transition">Introduction</a></li>
                            <li><a href="#quickstart" className="hover:text-green-400 transition">Quick Start</a></li>
                            <li><a href="#authentication" className="hover:text-green-400 transition">Authentication</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-4">Core Concepts</h3>
                        <ul className="space-y-3 text-gray-400 border-l border-zinc-800 pl-4">
                            <li><a href="#sessions" className="hover:text-green-400 transition">Sessions</a></li>
                            <li><a href="#webhooks" className="hover:text-green-400 transition">Webhooks</a></li>
                            <li><a href="#rate-limits" className="hover:text-green-400 transition">Rate Limits</a></li>
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="md:col-span-3 space-y-16">

                    <section id="intro">
                        <h2 className="text-3xl font-bold mb-6 text-white">Introduction</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Welcome to the WhatsApp API SaaS documentation. Our platform provides a robust, RESTful API to programmatically interact with WhatsApp.
                            Built on top of the powerful <code className="bg-zinc-900 px-1 py-0.5 rounded text-green-300">Baileys</code> library, we offer a multi-session architecture that allows you to manage hundreds of WhatsApp numbers from a single dashboard.
                        </p>
                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                            <h4 className="font-bold text-white mb-2">Key Capabilities</h4>
                            <ul className="list-disc list-inside text-gray-400 space-y-2">
                                <li>Send Text, Images, Videos, Audio, and Documents.</li>
                                <li>Create and manage Groups.</li>
                                <li>Real-time event notifications via Webhooks.</li>
                                <li>Interactive Polls and Location sharing.</li>
                            </ul>
                        </div>
                    </section>

                    <section id="quickstart">
                        <h2 className="text-3xl font-bold mb-6 text-white">Quick Start</h2>
                        <ol className="space-y-6 list-decimal list-inside text-gray-300">
                            <li className="pl-2">
                                <strong className="text-white">Create an Account:</strong> Register on the platform to get your main API Access.
                            </li>
                            <li className="pl-2">
                                <strong className="text-white">Start a Session:</strong> Go to the Dashboard and click <span className="text-blue-400">Add Device</span>. Give it a name (e.g., "Support-Bot").
                            </li>
                            <li className="pl-2">
                                <strong className="text-white">Scan QR Code:</strong> Click "Connect" and scan the QR code with your WhatsApp mobile app (Linked Devices).
                            </li>
                            <li className="pl-2">
                                <strong className="text-white">Get API Key:</strong> Once connected, the dashboard will reveal your unique <code>x-api-key</code> for that session.
                            </li>
                        </ol>
                    </section>

                    <section id="authentication">
                        <h2 className="text-3xl font-bold mb-6 text-white">Authentication</h2>
                        <p className="text-gray-300 mb-4">
                            All API requests require authentication. We use header-based authentication.
                        </p>
                        <div className="bg-black border border-zinc-700 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                            <span className="text-purple-400">x-api-key</span>: <span className="text-green-400">your_session_api_key</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-4">
                            For Dashboard-related actions (creating sessions, etc.), we use standard JWT Bearer tokens which are handled automatically by the frontend.
                        </p>
                    </section>

                    <section id="sessions">
                        <h2 className="text-3xl font-bold mb-6 text-white">Sessions</h2>
                        <p className="text-gray-300">
                            A <strong>Session</strong> represents a single connected WhatsApp phone number. Each session runs in isolation, meaning actions on one session do not affect others.
                            You can indefinitely scale the number of sessions based on your server capacity.
                        </p>
                    </section>

                    <section id="apidocs">
                        <h2 className="text-3xl font-bold mb-6 text-white">Full API Reference</h2>
                        <p className="text-gray-300 mb-6">
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
