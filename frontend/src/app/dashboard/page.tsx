'use client';

import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function Dashboard() {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, verify token from localStorage here first

        const fetchQR = async () => {
            try {
                const res = await fetch('http://localhost:3001/qr'); // Public endpoint for demo
                const data = await res.json();
                if (data.qr) setQrCode(data.qr);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching QR:', error);
                setLoading(false);
            }
        };

        fetchQR();
        const interval = setInterval(fetchQR, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex min-h-screen">
            {/* Dashboard Sidebar */}
            <nav className="w-64 bg-gray-900 text-white p-6 hidden md:block">
                <h1 className="text-2xl font-bold mb-8">WhatsApp SaaS</h1>
                <ul className="space-y-4">
                    <li className="font-bold text-green-400">Connect Device</li>
                    <li className="text-gray-400 hover:text-white cursor-pointer">Logs & Activity</li>
                    <li className="text-gray-400 hover:text-white cursor-pointer">Settings</li>
                    <li className="text-gray-400 hover:text-white cursor-pointer"><a href="/docs">API Docs</a></li>
                </ul>
            </nav>

            {/* Content */}
            <main className="flex-1 p-10 bg-gray-50 dark:bg-black">
                <h2 className="text-3xl font-bold mb-6 text-black dark:text-white">Connect Device</h2>
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-lg inline-block">
                    {loading ? (
                        <p className="text-gray-500">Loading QR...</p>
                    ) : qrCode ? (
                        <QRCodeCanvas value={qrCode} size={256} />
                    ) : (
                        <div className="p-10 bg-green-100 rounded text-green-800 font-bold">Bot Connected!</div>
                    )}
                </div>
            </main>
        </div>
    );
}
