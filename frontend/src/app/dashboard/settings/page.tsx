'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState('Loading...');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    const fetchUserData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('http://localhost:3001/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setApiKey(data.user.api_key);
                setUsername(data.user.username);
                setEmail(data.user.email);
            } else {
                localStorage.removeItem('token');
                router.push('/login');
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [router]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        alert('Copied!');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-black dark:text-white">Settings</h2>

            <div className="grid gap-8">
                {/* Profile Card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <span>👤</span> Profile Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Username</label>
                            <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{username}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                            <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{email}</p>
                        </div>
                    </div>
                </div>

                {/* API Configuration */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <span>🔑</span> API Configuration
                    </h3>

                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Your API Key</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-gray-100 dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-zinc-700 font-mono text-sm text-gray-800 dark:text-green-400 break-all transition-all hover:border-green-500/50">
                                {apiKey}
                            </code>
                            <button
                                onClick={copyToClipboard}
                                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 px-6 py-2 rounded-lg text-gray-700 dark:text-white transition font-medium border border-gray-200 dark:border-zinc-700"
                            >
                                Copy
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                            Include this key in the <code className="text-purple-400">x-api-key</code> header of your requests to authenticate.
                        </p>
                    </div>

                    <div className="border-t border-gray-100 dark:border-zinc-800 pt-8">
                        <h4 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">Session Management</h4>
                        <p className="text-gray-500 mb-6 text-sm">
                            Manage multiple WhatsApp sessions, connect devices, and disconnect sessions in the Device Manager.
                        </p>
                        <Link
                            href="/dashboard"
                            className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-white px-6 py-3 rounded-lg font-bold transition inline-block border border-gray-200 dark:border-zinc-700"
                        >
                            Go to Device Manager →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
