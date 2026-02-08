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
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans selection:bg-green-500 selection:text-white">

            {/* Navbar */}
            <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        WhatsApp SaaS API
                    </Link>
                    <div className="flex gap-4">
                        <Link href="/dashboard" className="text-sm font-medium hover:text-green-500 transition">Dashboard</Link>
                        <Link href="https://github.com/WhiskeySockets/Baileys" target="_blank" className="text-sm font-medium hover:text-green-500 transition">Baileys</Link>
                    </div>
                </div>
            </header>

            <div className="flex pt-16 max-w-7xl mx-auto">
                {/* Sidebar Navigation */}
                <aside className="w-64 fixed h-[calc(100vh-4rem)] overflow-y-auto hidden md:block border-r border-gray-200 dark:border-zinc-800 p-6">
                    <nav className="space-y-8">
                        <div>
                            <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Getting Started</h5>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><button onClick={() => scrollToSection('introduction')} className="hover:text-green-500 transition text-left w-full">Introduction</button></li>
                                <li><button onClick={() => scrollToSection('auth')} className="hover:text-green-500 transition text-left w-full">Authentication</button></li>
                                <li><button onClick={() => scrollToSection('base-url')} className="hover:text-green-500 transition text-left w-full">Base URL</button></li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Messaging</h5>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><button onClick={() => scrollToSection('send-text')} className="hover:text-green-500 transition text-left w-full">Text Messages</button></li>
                                <li><button onClick={() => scrollToSection('send-media')} className="hover:text-green-500 transition text-left w-full">Media (Img/Vid)</button></li>
                                <li><button onClick={() => scrollToSection('polls')} className="hover:text-green-500 transition text-left w-full">Polls</button></li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Resources</h5>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><Link href="/dashboard/playground" className="block hover:text-green-500 transition text-blue-400">Try Playground</Link></li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 md:ml-64 p-8 md:p-12 lg:pr-24">
                    <div className="prose dark:prose-invert max-w-none">

                        <div className="mb-16">
                            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">API Documentation</h1>
                            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                                Welcome to the comprehensive guide for the WhatsApp SaaS API.
                                Build automated workflows, send rich media, and engage users with ease.
                            </p>
                            <div className="mt-8 flex gap-4">
                                <Link href="/dashboard/playground" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 md:text-lg transition-all shadow-lg hover:shadow-green-500/25">
                                    Open Playground
                                </Link>
                                <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-zinc-700 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 md:text-lg transition-all">
                                    Dashboard
                                </Link>
                            </div>
                        </div>

                        <hr className="my-12 border-gray-200 dark:border-zinc-800" />

                        <section id="introduction" className="scroll-mt-24 mb-20">
                            <h2 className="text-3xl font-bold mb-6 group">Authentication</h2>
                            <p className="mb-6 text-gray-600 dark:text-gray-400">
                                Authenticate your requests using the <code className="text-purple-500 bg-purple-100 dark:bg-purple-900/30 px-1 py-0.5 rounded">x-api-key</code> header.
                                Retrieve your key from the Dashboard Settings.
                            </p>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                                <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/50 border-b border-zinc-800">
                                    <div className="flex space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                    </div>
                                    <span className="text-xs text-zinc-500 font-mono">bash</span>
                                </div>
                                <div className="p-6 overflow-x-auto">
                                    <pre className="text-sm font-mono leading-relaxed text-blue-300">
                                        {`curl -X POST http://localhost:3001/messages/text \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"phone": "593991234567", "message": "Hello World"}'`}
                                    </pre>
                                </div>
                            </div>
                        </section>

                        <section id="base-url" className="scroll-mt-24 mb-20">
                            <h2 className="text-3xl font-bold mb-6">Base URL</h2>
                            <div className="p-4 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg font-mono text-sm text-gray-800 dark:text-gray-300">
                                http://localhost:3001
                            </div>
                        </section>

                        <section id="send-text" className="scroll-mt-24 mb-20">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                                <h2 className="text-3xl font-bold m-0">/messages/text</h2>
                            </div>
                            <p className="mb-6 text-gray-600 dark:text-gray-400">Send a simple text message to any WhatsApp number.</p>

                            <div className="grid lg:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Parameters</h4>
                                    <ul className="space-y-4">
                                        <li className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                                            <code className="text-blue-500 font-bold">phone</code>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm">Target phone number with country code (e.g. 593...)</span>
                                        </li>
                                        <li className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                                            <code className="text-blue-500 font-bold">message</code>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm">Text content to send. Supports emojis.</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                                    <div className="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 text-xs text-zinc-500 font-mono">JSON Payload</div>
                                    <div className="p-4 overflow-x-auto">
                                        <pre className="text-sm font-mono text-emerald-400">
                                            {`{
  "phone": "593991234567",
  "message": "Hello from API! 🚀"
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="send-media" className="scroll-mt-24 mb-20">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                                <h2 className="text-3xl font-bold m-0">/messages/image</h2>
                            </div>
                            <p className="mb-6 text-gray-600 dark:text-gray-400">Send an image with an optional caption.</p>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                                <div className="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 text-xs text-zinc-500 font-mono">JSON Payload</div>
                                <div className="p-4 overflow-x-auto">
                                    <pre className="text-sm font-mono text-emerald-400">
                                        {`{
  "phone": "593991234567",
  "imageUrl": "https://example.com/image.png",
  "caption": "Check this out! 📸"
}`}
                                    </pre>
                                </div>
                            </div>
                        </section>

                    </div>
                </main>
            </div>
        </div>
    );
}
