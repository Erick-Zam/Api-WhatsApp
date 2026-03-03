'use client';
import { useState, SyntheticEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const LoginForm = ({ onClose, onSwitch }: { onClose: () => void, onSwitch: () => void }) => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
            const res = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                router.push('/dashboard');
            } else {
                alert('Login Failed');
            }
        } catch {
            alert('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md p-8 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-zinc-800 p-2 rounded-full">✕</button>
                <h2 className="text-3xl font-extrabold text-white mb-6 text-center">Welcome Back</h2>
                <form onSubmit={handleLogin} className="space-y-4 text-left">
                    <div>
                        <label htmlFor="login-email" className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                        <input id="login-email" type="email" placeholder="Email" className="w-full p-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="login-password" className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
                        <input id="login-password" type="password" placeholder="Password" className="w-full p-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3.5 mt-2 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition">
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>
                <p className="mt-6 text-center text-gray-400 text-sm">Don&apos;t have an account? <button onClick={onSwitch} className="text-green-400 hover:underline">Register</button></p>
            </div>
        </div>
    );
};

const RegisterForm = ({ onClose, onSwitch }: { onClose: () => void, onSwitch: () => void }) => {
    const [email, setEmail] = useState('admin@erickvillon.dev');
    const [username, setUsername] = useState('Erick Villon');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
            const res = await fetch(`${apiBase}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
            });
            if (res.ok) {
                alert('Account created! You can now log in.');
                onSwitch();
            } else {
                const data = await res.json();
                alert(data.error || 'Registration failed');
            }
        } catch {
            alert('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md p-8 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-zinc-800 p-2 rounded-full">✕</button>
                <h2 className="text-3xl font-extrabold text-white mb-6 text-center">Create Account</h2>
                <form onSubmit={handleRegister} className="space-y-4 text-left">
                    <div>
                        <label htmlFor="reg-username" className="block text-xs font-bold text-gray-400 uppercase mb-1">Username</label>
                        <input id="reg-username" type="text" placeholder="Username" className="w-full p-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="reg-email" className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                        <input id="reg-email" type="email" placeholder="Email" className="w-full p-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="reg-password" className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
                        <input id="reg-password" type="password" placeholder="Password" className="w-full p-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
                        {loading ? 'Creating...' : 'Register'}
                    </button>
                </form>
                <p className="mt-6 text-center text-gray-400 text-sm">Already have an account? <button onClick={onSwitch} className="text-blue-400 hover:underline">Log in</button></p>
            </div>
        </div>
    );
};

export default function Home() {
    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-10 text-center relative">
            {showLogin && <LoginForm onClose={() => setShowLogin(false)} onSwitch={() => { setShowLogin(false); setShowRegister(true); }} />}
            {showRegister && <RegisterForm onClose={() => setShowRegister(false)} onSwitch={() => { setShowRegister(false); setShowLogin(true); }} />}

            <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                WhatsApp API SaaS
            </h1>
            <p className="text-xl max-w-2xl text-gray-400 mb-10">
                The ultimate platform to automate your WhatsApp messages.
                Send polls, media, and track detailed analytics.
            </p>

            <div className="flex gap-4">
                <button
                    onClick={() => setShowLogin(true)}
                    className="px-8 py-3 bg-green-500 rounded-full font-bold hover:bg-green-400 transition shadow-lg shadow-green-500/20 cursor-pointer"
                >
                    Login
                </button>
                <button
                    onClick={() => setShowRegister(true)}
                    className="px-8 py-3 bg-blue-600 rounded-full font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                    Register
                </button>
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
                    </div>
                </div>
            </div>
        </main>
    );
}
