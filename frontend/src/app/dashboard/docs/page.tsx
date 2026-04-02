'use client';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function Docs() {
    const { t } = useTranslation();
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
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-6 border-r border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]">
                <nav className="space-y-8 pb-10">
                    <div>
                        <h5 className="mb-4 font-bold theme-text-main uppercase tracking-wider text-xs">Overview</h5>
                        <ul className="space-y-3 text-sm theme-text-muted">
                            <li><button onClick={() => scrollToSection('introduction')} className="hover:text-green-500 transition text-left w-full">{t('docs2.intro')}</button></li>
                            <li><button onClick={() => scrollToSection('architecture')} className="hover:text-green-500 transition text-left w-full">{t('docs2.architecture')}</button></li>
                            <li><button onClick={() => scrollToSection('auth')} className="hover:text-green-500 transition text-left w-full">{t('docs2.auth')}</button></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="mb-4 font-bold theme-text-main uppercase tracking-wider text-xs">Messaging Endpoints</h5>
                        <ul className="space-y-3 text-sm theme-text-muted">
                            <li><button onClick={() => scrollToSection('send-text')} className="hover:text-green-500 transition text-left w-full">Text Messages</button></li>
                            <li><button onClick={() => scrollToSection('send-media')} className="hover:text-green-500 transition text-left w-full">Images & Videos</button></li>
                            <li><button onClick={() => scrollToSection('send-audio')} className="hover:text-green-500 transition text-left w-full">Audio & Documents</button></li>
                            <li><button onClick={() => scrollToSection('send-location')} className="hover:text-green-500 transition text-left w-full">Location</button></li>
                            <li><button onClick={() => scrollToSection('send-poll')} className="hover:text-green-500 transition text-left w-full">Polls</button></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="mb-4 font-bold theme-text-main uppercase tracking-wider text-xs">Advanced API</h5>
                        <ul className="space-y-3 text-sm theme-text-muted">
                            <li><button onClick={() => scrollToSection('groups')} className="hover:text-green-500 transition text-left w-full">Group Management</button></li>
                            <li><button onClick={() => scrollToSection('webhooks')} className="hover:text-green-500 transition text-left w-full">Webhooks</button></li>
                            <li><button onClick={() => scrollToSection('errors')} className="hover:text-green-500 transition text-left w-full">Error Codes</button></li>
                        </ul>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 pb-20">
                <div className="max-w-none">

                    <div className="mb-16" id="introduction">
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">{t('docs2.title')}</h1>
                        <p className="text-xl theme-text-muted leading-relaxed">
                            {t('docs2.introDesc')}
                        </p>
                        <div className="mt-8 flex gap-4">
                            <Link href="/dashboard/playground" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 md:text-lg transition-all shadow-lg hover:shadow-green-500/25">
                                Open Playground
                            </Link>
                        </div>
                    </div>

                    <hr className="my-12 border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]" />

                    {/* Architecture Section */}
                    <section id="architecture" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6">{t('docs2.architecture')}</h2>
                        <p className="mb-6 theme-text-muted">
                            {t('docs2.archDesc')}
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 theme-card rounded-xl hover:brightness-105 transition-all">
                                <h3 className="font-bold text-lg mb-2 text-green-500 transition-colors">📱 Multi-Session Scalability</h3>
                                <p className="theme-text-muted text-sm">Scale your customer service with multiple phone numbers connected simultaneously. Each session is completely isolated making it easy to manage distinct teams.</p>
                            </div>
                            <div className="p-6 theme-card rounded-xl hover:brightness-105 transition-all">
                                <h3 className="font-bold text-lg mb-2 text-blue-500">📎 Rich Media Engine</h3>
                                <p className="theme-text-muted text-sm">Send images, videos, audio notes, PDF documents, location pins, and interactive polls programmatically returning high conversion rates.</p>
                            </div>
                            <div className="p-6 theme-card rounded-xl hover:brightness-105 transition-all">
                                <h3 className="font-bold text-lg mb-2 text-indigo-500">📊 Centralized History</h3>
                                <p className="theme-text-muted text-sm">Every message sent and received across all sessions is stored centrally within PostgreSQL, ensuring you can review communications from an admin view securely.</p>
                            </div>
                            <div className="p-6 theme-card rounded-xl hover:brightness-105 transition-all">
                                <h3 className="font-bold text-lg mb-2 text-cyan-500">🔐 Secure Communication</h3>
                                <p className="theme-text-muted text-sm">Leverage encrypted HTTPS via our proxy on Docker. Your database is isolated from public view and user tokens are strongly hashed.</p>
                            </div>
                        </div>
                    </section>

                    <section id="auth" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6 group">{t('docs2.auth')}</h2>
                        <p className="mb-6 theme-text-muted">
                            {t('docs2.authDesc')} <code className="text-purple-500 bg-purple-100 dark:bg-purple-900/30 px-1 py-0.5 rounded">x-api-key</code>.
                            <br /><br />
                            <strong>🔑 {t('docs2.howToGet')}</strong> {t('docs.howToGetApiKeyDesc')}
                        </p>

                        <div className="theme-code-block rounded-xl overflow-hidden mb-4">
                            <div className="px-4 py-2 border-b border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] text-xs theme-text-soft font-mono">Authentication Header Standard</div>
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
                        <p className="mb-4 theme-text-muted">Send simple text messages to any WhatsApp number in the world. Valid phone format avoids symbols and uses the standard country code upfront.</p>
                        
                        <h4 className="font-bold mb-2">Request Body Requirements</h4>
                        <ul className="mb-4 text-sm theme-text-muted space-y-2 list-disc ml-5">
                            <li><code className="text-blue-400 font-bold">phone</code> (string, <span className="text-red-400">required</span>): Your recipient&apos;s phone number exactly digits-only (e.g. 593981234567).</li>
                            <li><code className="text-blue-400 font-bold">message</code> (string, <span className="text-red-400">required</span>): The plaintext message body. You can use newline characters for spacing (\n).</li>
                        </ul>

                        <div className="theme-code-block rounded-xl overflow-hidden p-4">
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
                        <p className="mb-4 theme-text-muted">Send images and videos to any chat. High-quality media is processed and delivered via WhatsApp&apos;s native media handling.</p>
                        
                        <div className="theme-code-block rounded-xl overflow-hidden p-4 mb-8">
                            <div className="text-xs theme-text-soft mb-2 uppercase font-mono">Image Example</div>
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
                        <div className="theme-code-block rounded-xl overflow-hidden p-4">
                            <div className="text-xs theme-text-soft mb-2 uppercase font-mono">Video Example</div>
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
                        <p className="mb-4 theme-text-muted">Deliver audio notes or music files. Supported formats: mp3, ogg, wav.</p>
                        <div className="theme-code-block rounded-xl overflow-hidden p-4 mb-12">
                            <pre className="text-sm font-mono text-emerald-400">{`{ 
  "phone": "593981234567", 
  "audioUrl": "https://example.com/voice.mp3"
}`}</pre>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                            <h2 className="text-2xl md:text-3xl font-bold m-0 break-all">{baseUrl}/messages/document</h2>
                        </div>
                        <p className="mb-4 theme-text-muted">Send PDF, Word, Excel, or other files as native document attachments.</p>
                        <div className="theme-code-block rounded-xl overflow-hidden p-4">
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
                        <p className="mb-4 theme-text-muted">Generate an interactive map preview block by pinpointing exact geographic coordinates. Helpful for businesses needing immediate navigational context.</p>
                        
                        <h4 className="font-bold mb-2">Request Body Requirements</h4>
                        <ul className="mb-4 text-sm theme-text-muted space-y-2 list-disc ml-5">
                            <li><code className="text-blue-400 font-bold">phone</code> (string, <span className="text-red-400">required</span>): The digits-only recipient number.</li>
                            <li><code className="text-blue-400 font-bold">latitude</code> (float, <span className="text-red-400">required</span>): Precision latitude coordinate logic (e.g. -2.13).</li>
                            <li><code className="text-blue-400 font-bold">longitude</code> (float, <span className="text-red-400">required</span>): Precision longitude coordinate logic.</li>
                        </ul>

                        <div className="theme-code-block rounded-xl overflow-hidden p-4">
                            <pre className="text-sm font-mono text-emerald-400">{`{ 
  "phone": "593991234567", 
  "latitude": -2.13289, 
  "longitude": -79.90123 
}`}</pre>
                        </div>
                    </section>

                    <section id="groups" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6">Group Management</h2>
                        <p className="mb-8 theme-text-muted">Programmatically create groups, add participants, and manage metadata.</p>
                        
                        <div className="space-y-12">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-sm font-bold">POST</span>
                                    <h3 className="text-xl font-bold m-0">{baseUrl}/chats/groups</h3>
                                </div>
                                <div className="theme-code-block rounded-xl overflow-hidden p-4">
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
                                <p className="text-sm theme-text-soft mb-4 italic">Fetch metadata for a group you are part of.</p>
                            </div>
                        </div>
                    </section>

                    <section id="webhooks" className="scroll-mt-24 mb-20">
                        <h2 className="text-3xl font-bold mb-6">Webhooks & Events</h2>
                        <p className="mb-6 theme-text-muted">
                            Configure your webhook URL in the Dashboard to receive real-time notifications about incoming messages, status updates, and session changes.
                        </p>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg mb-8">
                            <p className="text-sm text-amber-500"><strong>Note:</strong> Your webhook server must return a 200 OK status to acknowledge event delivery.</p>
                        </div>
                        
                        <div className="theme-code-block rounded-xl overflow-hidden p-4">
                            <div className="text-xs theme-text-soft mb-2 uppercase font-mono">Incoming Message Payload (example)</div>
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
                                <tr className="border-b border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)]">
                                    <th className="py-2 pr-4">Code</th>
                                    <th className="py-2 pr-4">Meaning</th>
                                    <th className="py-2">Solution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[color:color-mix(in_srgb,var(--border-soft)_75%,transparent)]">
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">401</td>
                                    <td className="py-3">Unauthorized</td>
                                    <td className="py-3 theme-text-muted">API key is missing or invalid. Check x-api-key header.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">403</td>
                                    <td className="py-3">Forbidden</td>
                                    <td className="py-3 theme-text-muted">Rate limit exceeded or session is disconnected.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">404</td>
                                    <td className="py-3">Not Found</td>
                                    <td className="py-3 theme-text-muted">Recipent number is not on WhatsApp or invalid JID.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-red-500 font-bold">429</td>
                                    <td className="py-3">Too Many Requests</td>
                                    <td className="py-3 theme-text-muted">Wait a few seconds. Limit: 10 messages/min per session.</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>
            </main>
        </div>
    );
}
