'use client';
import { useState, SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleRegister = async (e: SyntheticEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
            });

            const data = await res.json();

            if (res.ok) {
                router.push('/login?registered=true');
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            {/* Modal Container */}
            <div className="relative w-full max-w-md p-8 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 mt-10 mb-10">
                {/* Close Button linking back to Home */}
                <Link href="/" className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Create Account</h1>
                    <p className="text-gray-400 text-sm">Join the ultimate WhatsApp API platform</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label htmlFor="username" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Nombre</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="e.g. jdoe, Acme Corp"
                            className="w-full p-3.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="w-full p-3.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="w-full p-3.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <button className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
                        Create Account
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                    <p className="text-gray-400 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Log in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
