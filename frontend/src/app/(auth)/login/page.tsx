'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('token', data.token); // Store simple JWT
            router.push('/dashboard');
        } else {
            alert('Login Failed');
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
                    <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-gray-400 text-sm">Log in to manage your WhatsApp sessions</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="doc@example.com"
                            className="w-full p-3.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                            <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                            <span className="text-xs text-green-400 hover:text-green-300 font-medium cursor-pointer transition-colors">Forgot?</span>
                        </div>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="w-full p-3.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button className="w-full py-3.5 mt-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
                        Log In
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                    <p className="text-gray-400 text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
                            Sign up here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
