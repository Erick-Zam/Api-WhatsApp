import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-10 text-center">
      <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
        WhatsApp API SaaS
      </h1>
      <p className="text-xl max-w-2xl text-gray-400 mb-10">
        The ultimate platform to automate your WhatsApp messages.
        Send polls, media, and track detailed analytics.
      </p>

      <div className="flex gap-4">
        <Link href="/login" className="px-8 py-3 bg-green-500 rounded-full font-bold hover:bg-green-400 transition shadow-lg shadow-green-500/20">
          Login
        </Link>
        <Link href="/register" className="px-8 py-3 bg-blue-600 rounded-full font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">
          Register
        </Link>
        <Link href="/docs" className="px-8 py-3 bg-gray-800 rounded-full font-bold hover:bg-gray-700 transition border border-gray-700">
          Docs
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-xl font-bold mb-2 text-green-400">Multi-User</h3>
          <p className="text-gray-400">Manage multiple teams and API keys securely.</p>
        </div>
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-xl font-bold mb-2 text-blue-400">Analytics</h3>
          <p className="text-gray-400">Track every message sent and received.</p>
        </div>
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h3 className="text-xl font-bold mb-2 text-purple-400">Interactive</h3>
          <p className="text-gray-400">Send polls, stickers, and location data.</p>
        </div>
      </div>

      <div className="mt-24 max-w-4xl text-left border-t border-zinc-800 pt-16">
        <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-400">
          System Capabilities
        </h2>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">🚀 Advanced Messaging</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Go beyond simple text. Send images, videos, audio, PDF documents, contacts, and location coordinates directly through the API.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">📊 Real-time Monitoring</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Watch message status updates (sent, delivered, read) in real-time. Use webhooks to integrate these events into your own CRM or external systems.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">🤖 Automated Workflows</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Create automated responses, chatbots, and scheduled messages. Ideal for customer support, appointment reminders, and marketing campaigns.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">🔐 Secure & Isolated</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Each session runs in its own isolated environment. User data and authentication tokens are encrypted and securely stored.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">👥 Group Management</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Programmatically create groups, add/remove participants, and update group settings. Manage communities at scale.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">📝 Interactive Polls</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Engage your audience with native WhatsApp polls. Collect feedback and survey results instantly via the API.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
