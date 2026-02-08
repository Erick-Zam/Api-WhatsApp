export default function Docs() {
    return (
        <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r dark:border-zinc-800 p-6 hidden md:block fixed h-full overflow-y-auto">
                <h2 className="font-bold text-xl mb-4">API Reference</h2>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li><a href="#auth" className="hover:text-green-500">Authentication</a></li>
                    <li><a href="#send-text" className="hover:text-green-500">Send Text</a></li>
                    <li><a href="#send-media" className="hover:text-green-500">Send Media</a></li>
                    <li><a href="#polls" className="hover:text-green-500">Polls</a></li>
                </ul>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-10 max-w-4xl">
                <h1 className="text-4xl font-bold mb-6">Documentation</h1>

                <section id="auth" className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
                    <p className="mb-4">All requests to <code>/messages</code> endpoints require the <code>x-api-key</code> header.</p>
                    <div className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-md font-mono text-sm">
                        x-api-key: your-secure-key
                    </div>
                </section>

                <section id="send-text" className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Send Text Message</h2>
                    <div className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-md font-mono text-sm mb-4">
                        POST /messages/text
                    </div>
                    <h3 className="font-bold mb-2">Payload</h3>
                    <pre className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-md overflow-x-auto text-sm">
                        {`{
  "phone": "593991234567",
  "message": "Hello World"
}`}
                    </pre>
                </section>

                <section id="polls" className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Send Poll</h2>
                    <div className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-md font-mono text-sm mb-4">
                        POST /messages/poll
                    </div>
                    <h3 className="font-bold mb-2">Payload</h3>
                    <pre className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-md overflow-x-auto text-sm">
                        {`{
  "phone": "593991234567",
  "name": "Question?",
  "values": ["Option A", "Option B"],
  "singleSelect": true
}`}
                    </pre>
                </section>
            </main>
        </div>
    );
}
