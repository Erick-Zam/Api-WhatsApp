'use client';
import Link from 'next/link';

export default function Docs() {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://ws.erickvillon.dev/api";

    return (
        <div className="max-w-7xl mx-auto flex gap-8 relative">
            {/* Sidebar Navigation - Sticky within the scroll container */}
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-6 border-r border-gray-200 dark:border-zinc-800 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                <nav className="space-y-8 pb-10">
                    <div>
                        <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Overview</h5>
                        <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                            <li><button onClick={() => scrollToSection('introduction')} className="hover:text-green-500 transition text-left w-full">Introduction</button></li>
                            <li><button onClick={() => scrollToSection('architecture')} className="hover:text-green-500 transition text-left w-full">System Capabilities</button></li>
                            <li><button onClick={() => scrollToSection('auth')} className="hover:text-green-500 transition text-left w-full">Authentication</button></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Messaging Endpoints</h5>
                        <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                            <li><button onClick={() => scrollToSection('send-text')} className="hover:text-green-500 transition text-left w-full">Text Messages</button></li>
                            <li><button onClick={() => scrollToSection('send-media')} className="hover:text-green-500 transition text-left w-full">Images & Videos</button></li>
                            <li><button onClick={() => scrollToSection('send-audio')} className="hover:text-green-500 transition text-left w-full">Audio & Documents</button></li>
                            <li><button onClick={() => scrollToSection('send-location')} className="hover:text-green-500 transition text-left w-full">Location</button></li>
                            <li><button onClick={() => scrollToSection('send-poll')} className="hover:text-green-500 transition text-left w-full">Polls</button></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="mb-4 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider text-xs">Advanced API</h5>
                        <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                            <li><button onClick={() => scrollToSection('groups')} className="hover:text-green-500 transition text-left w-full">Group Management</button></li>
                            <li><button onClick={() => scrollToSection('webhooks')} className="hover:text-green-500 transition text-left w-full">Webhooks</button></li>
                            <li><button onClick={() => scrollToSection('errors')} className="hover:text-green-500 transition text-left w-full">Error Codes</button></li>
                        </ul>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 pb-20">
                <div className="prose dark:prose-invert max-w-none">

                    <div className="mb-16" id="introduction">
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">API Documentation</h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                            Welcome to the WhatsApp SaaS API. A powerful, multi-session WhatsApp automation tool built for scale. 
                            This documentation will guide you through all system endpoints, their exact required payloads, and how to use them with your unique API keys.
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
                        <h2 className="text-3xl font-bold mb-6">System Capabilities & Architecture</h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Our architecture provides stable WhatsApp connectivity using the Baileys library and supports multiple 
                            concurrent user sessions isolated natively via unique API keys.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-green-500 transition-colors">📱 Multi-Session Scalability</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Scale your customer service with multiple phone numbers connected simultaneously. Each session is completely isolated making it easy to manage distinct teams.</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-blue-500">📎 Rich Media Engine</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Send images, videos, audio notes, PDF documents, location pins, and interactive polls programmatically returning high conversion rates.</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-indigo-500">📊 Centralized History</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Every message sent and received across all sessions is stored centrally within PostgreSQL, ensuring you can review communications from an admin view securely.</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-cyan-500">🔐 Secure Communication</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Leverage encrypted HTTPS via our proxy on Docker. Your database is isolated from public view and user tokens are strongly hashed.</p>
                            </div>
                        </div>
                    </section>

                    <section id="auth" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6 group">Authentication</h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            All requests to the messaging endpoints require authentication using the <code className="text-purple-500 bg-purple-100 dark:bg-purple-900/30 px-1 py-0.5 rounded">x-api-key</code> header.
                            <br /><br />
                            <strong>🔑 How to get your API Key:</strong> Once you pair a device in the dashboard, navigate into the &quot;Settings&quot; menu to view and copy your active Session API Key. Each device you pair runs independently under its given key.
                        </p>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl mb-4">
                            <div className="px-4 py-2 bg-zinc-950/50 border-b border-zinc-800 text-xs text-zinc-500 font-mono">Authentication Header Standard</div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm font-mono leading-relaxed text-blue-300">
                                    {`curl -X POST ${baseUrl}/messages/text \\
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
                            <h2 className="text-2xl md:text-3xl font-bold m-0 break-all">{baseUrl}/messages/text</h2>
                        </div>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">Send simple text messages to any WhatsApp number in the world. Valid phone format avoids symbols and uses the standard country code upfront.</p>
                        
                        <h4 className="font-bold mb-2">Request Body Requirements</h4>
                        <ul className="mb-4 text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc ml-5">
                            <li><code className="text-blue-400 font-bold">phone</code> (string, <span className="text-red-400">required</span>): Your recipient&apos;s phone number exactly digits-only (e.g. 593981234567).</li>
                            <li><code className="text-blue-400 font-bold">message</code> (string, <span className="text-red-400">required</span>): The plaintext message body. You can use newline characters for spacing (\n).</li>
                        </ul>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{
  "phone": "593991234567", 
  "message": "Hola, este es un mensaje de prueba con la nueva URL!" 
}`}</pre>
                        </div>
                    </section>

                    <section id="send-media" className="scroll-mt-24 mb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-2xl md:text-3xl font-bold m-0 break-all">{baseUrl}/messages/image</h2>
                        </div>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">Send images and videos to any chat. High-quality media is processed and delivered via WhatsApp&apos;s native media handling.</p>
                        
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4 mb-8">
                            <div className="text-xs text-gray-500 mb-2 uppercase font-mono">Image Example</div>
                            <pre className="text-sm font-mono text-emerald-400">{`{ 
  "phone": "593981234567", 
  "imageUrl": "https://picsum.photos/500/300", 
  "caption": "¡Increíble promoción sólo por hoy!" 
}`}</pre>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-2xl md:text-3xl font-bold m-0 break-all">{baseUrl}/messages/video</h2>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <div className="text-xs text-gray-500 mb-2 uppercase font-mono">Video Example</div>
                            <pre className="text-sm font-mono text-emerald-400">{`{ 
  "phone": "593981234567", 
  "videoUrl": "https://example.com/demo.mp4", 
  "caption": "Check this video!" 
}`}</pre>
                        </div>
                    </section>

                    <section id="send-audio" className="scroll-mt-24 mb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-2xl md:text-3xl font-bold m-0 break-all">{baseUrl}/messages/audio</h2>
                        </div>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">Deliver audio notes or music files. Supported formats: mp3, ogg, wav.</p>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4 mb-12">
                            <pre className="text-sm font-mono text-emerald-400">{`{ 
  "phone": "593981234567", 
  "audioUrl": "https://example.com/voice.mp3"
}`}</pre>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-2xl md:text-3xl font-bold m-0 break-all">{baseUrl}/messages/document</h2>
                        </div>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">Send PDF, Word, Excel, or other files as native document attachments.</p>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{ 
  "phone": "593981234567", 
  "documentUrl": "https://example.com/report.pdf",
  "fileName": "Monthly Report Q1.pdf"
}`}</pre>
                        </div>
                    </section>

                    <section id="send-location" className="scroll-mt-24 mb-20">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-2xl md:text-3xl font-bold m-0 break-all">{baseUrl}/messages/location</h2>
                        </div>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">Generate an interactive map preview block by pinpointing exact geographic coordinates. Helpful for businesses needing immediate navigational context.</p>
                        
                        <h4 className="font-bold mb-2">Request Body Requirements</h4>
                        <ul className="mb-4 text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc ml-5">
                            <li><code className="text-blue-400 font-bold">phone</code> (string, <span className="text-red-400">required</span>): The digits-only recipient number.</li>
                            <li><code className="text-blue-400 font-bold">latitude</code> (float, <span className="text-red-400">required</span>): Precision latitude coordinate logic (e.g. -2.13).</li>
                            <li><code className="text-blue-400 font-bold">longitude</code> (float, <span className="text-red-400">required</span>): Precision longitude coordinate logic.</li>
                        </ul>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{ 
  "phone": "593991234567", 
  "latitude": -2.13289, 
  "longitude": -79.90123 
}`}</pre>
                        </div>
                    </section>

                    <section id="groups" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6">Group Management</h2>
                        <p className="mb-8 text-gray-600 dark:text-gray-400">Programmatically create groups, add participants, and manage metadata.</p>
                        
                        <div className="space-y-12">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                                    <h3 className="text-xl font-bold m-0">{baseUrl}/chats/groups</h3>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-4">
                                    <pre className="text-sm font-mono text-emerald-400">{`{
  "subject": "Company Team",
  "participants": ["593991234560", "593991234561"]
}`}</pre>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-sm font-bold">GET</span>
                                    <h3 className="text-xl font-bold m-0">{baseUrl}/chats/groups/[jid]</h3>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 italic">Fetch metadata for a group you are part of.</p>
                            </div>
                        </div>
                    </section>

                    <section id="webhooks" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6">Webhooks & Events</h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Configure your webhook URL in the Dashboard to receive real-time notifications about incoming messages, status updates, and session changes.
                        </p>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg mb-8">
                            <p className="text-sm text-amber-500"><strong>Note:</strong> Your webhook server must return a 200 OK status to acknowledge event delivery.</p>
                        </div>
                        
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-4">
                            <div className="text-xs text-gray-500 mb-2 uppercase font-mono">Incoming Message Payload (example)</div>
                            <pre className="text-sm font-mono text-blue-300">{`{
  "sessionId": "Support-Bot",
  "event": "messages.upsert",
  "data": {
    "key": { "remoteJid": "593991234567@s.whatsapp.net", "fromMe": false, "id": "..." },
    "message": { "conversation": "Hello, how can I help?" },
    "pushName": "John Doe"
  }
}`}</pre>
                        </div>
                    </section>

                    <section id="errors" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6">Error Codes & Limits</h2>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-zinc-800">
                                    <th className="py-2 pr-4">Code</th>
                                    <th className="py-2 pr-4">Meaning</th>
                                    <th className="py-2">Solution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-900">
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">401</td>
                                    <td className="py-3">Unauthorized</td>
                                    <td className="py-3 text-gray-500">API key is missing or invalid. Check x-api-key header.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">403</td>
                                    <td className="py-3">Forbidden</td>
                                    <td className="py-3 text-gray-500">Rate limit exceeded or session is disconnected.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">404</td>
                                    <td className="py-3">Not Found</td>
                                    <td className="py-3 text-gray-500">Recipent number is not on WhatsApp or invalid JID.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">429</td>
                                    <td className="py-3">Too Many Requests</td>
                                    <td className="py-3 text-gray-500">Wait a few seconds. Limit: 10 messages/min per session.</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>
            </main>
        </div>
    );
}
