'use client';
import Link from 'next/link';

export default function Docs() {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="max-w-7xl mx-auto flex gap-8 relative">
            {/* Sidebar Navigation - Sticky within the scroll container */}
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-6 border-r border-gray-200 dark:border-zinc-800 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                <nav className="space-y-8 pb-10">
                    <div>
                        <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Overview</h5>
                        <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                            <li><button onClick={() => scrollToSection('introduction')} className="hover:text-green-500 transition text-left w-full">Introduction</button></li>
                            <li><button onClick={() => scrollToSection('architecture')} className="hover:text-green-500 transition text-left w-full">Architecture & Tech</button></li>
                            <li><button onClick={() => scrollToSection('auth')} className="hover:text-green-500 transition text-left w-full">Authentication</button></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Messaging Endpoints</h5>
                        <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                            <li><button onClick={() => scrollToSection('send-text')} className="hover:text-green-500 transition text-left w-full">Text Messages</button></li>
                            <li><button onClick={() => scrollToSection('send-media')} className="hover:text-green-500 transition text-left w-full">Media (Img/Vid)</button></li>
                            <li><button onClick={() => scrollToSection('send-location')} className="hover:text-green-500 transition text-left w-full">Location</button></li>
                            <li><button onClick={() => scrollToSection('send-poll')} className="hover:text-green-500 transition text-left w-full">Polls</button></li>
                            <li><button onClick={() => scrollToSection('send-contact')} className="hover:text-green-500 transition text-left w-full">Contacts</button></li>
                        </ul>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 pb-20">
                <div className="prose dark:prose-invert max-w-none">

                    <div className="mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">API Documentation</h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                            Welcome to the WhatsApp SaaS API. A powerful, multi-session WhatsApp automation tool built for scale.
                        </p>
                        <div className="mt-8 flex gap-4">
                            <Link href="/dashboard/playground" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 md:text-lg transition-all shadow-lg hover:shadow-green-500/25">
                                Open Playground
                            </Link>
                        </div>
                    </div>

                    <hr className="my-12 border-gray-200 dark:border-zinc-800" />

                    {/* Architecture Section */}
                    <section id="architecture" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6">Architecture & Technologies</h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Built with a robust, modern stack designed for performance and reliability.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                                <h3 className="font-bold text-lg mb-2 text-green-500">Node.js & Express</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">High-performance backend API handling concurrent requests and WebSocket connections.</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                                <h3 className="font-bold text-lg mb-2 text-blue-500">Baileys Library</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Lightweight, full-featured WhatsApp Web API implementation without requiring a headless browser.</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                                <h3 className="font-bold text-lg mb-2 text-indigo-500">PostgreSQL</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Reliable relational database for storing sessions, users, logs, and messages.</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                                <h3 className="font-bold text-lg mb-2 text-cyan-500">Docker</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Fully containerized architecture ensuring consistent deployment environments.</p>
                            </div>
                        </div>
                    </section>

                    <section id="auth" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6 group">Authentication</h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Requests are authenticated via the <code className="text-purple-500 bg-purple-100 dark:bg-purple-900/30 px-1 py-0.5 rounded">x-api-key</code> header.
                            <br />
                            <strong>Note:</strong> API Keys are unique per session (device). Generate one by connecting a session in the Dashboard.
                        </p>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 text-xs text-zinc-500 font-mono">Example Request</div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm font-mono leading-relaxed text-blue-300">
                                    {`curl -X POST /api/messages/text \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_SESSION_API_KEY" \\
  -d '{"phone": "593991234567", "message": "Hello World"}'`}
                                </pre>
                            </div>
                        </div>
                    </section>

                    {/* Endpoints */}

                    <section id="send-text" className="scroll-mt-24 mb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-3xl font-bold m-0">/messages/text</h2>
                        </div>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">Send simple text messages.</p>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{ "phone": "59399...", "message": "Hola!" }`}</pre>
                        </div>
                    </section>

                    <section id="send-media" className="scroll-mt-24 mb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-3xl font-bold m-0">/messages/image</h2>
                        </div>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">Send images via URL.</p>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{ "phone": "...", "imageUrl": "https://...", "caption": "Look!" }`}</pre>
                        </div>
                    </section>

                    <section id="send-location" className="scroll-mt-24 mb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-3xl font-bold m-0">/messages/location</h2>
                        </div>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">Share coordinates.</p>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{ "phone": "...", "latitude": -2.13, "longitude": -79.90 }`}</pre>
                        </div>
                    </section>

                    <section id="send-poll" className="scroll-mt-24 mb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-3xl font-bold m-0">/messages/poll</h2>
                        </div>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">Send interactive polls.</p>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{ \n  "phone": "...", \n  "name": "Pizza or Sushi?", \n  "values": ["Pizza", "Sushi", "Tacos"],\n  "singleSelect": true \n}`}</pre>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}
