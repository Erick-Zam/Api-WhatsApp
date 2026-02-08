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
        <Link href="/login" className="px-8 py-3 bg-green-500 rounded-full font-bold hover:bg-green-400 transition">
          Login
        </Link>
        <Link href="/docs" className="px-8 py-3 bg-gray-800 rounded-full font-bold hover:bg-gray-700 transition">
          View Documentation
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
    </main>
  );
}
