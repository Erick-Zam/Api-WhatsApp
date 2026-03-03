'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `/api`}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
            });

            const data = await res.json();

            if (res.ok) {
                // Determine if we should auto-login or redirect to login
                // For now, let's redirect to login
                router.push('/login?registered=true');
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md dark:bg-zinc-800">
                <h1 className="text-2xl font-bold mb-6 text-center text-black dark:text-white">Create an Account</h1>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <form onSubmit={handleRegister} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Username"
                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:text-white"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-2 border rounded dark:bg-zinc-700 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition">
                        Register
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                        Already have an account? <Link href="/login" className="text-blue-500 hover:underline">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
