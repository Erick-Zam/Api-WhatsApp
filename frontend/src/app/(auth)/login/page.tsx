'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('http://localhost:3001/auth/login', {
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
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md dark:bg-zinc-800">
                <h1 className="text-2xl font-bold mb-6 text-center text-black dark:text-white">Login to WhatsApp SaaS</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
