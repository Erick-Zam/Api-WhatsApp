'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    const isActive = (path: string) => pathname === path;

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch('http://localhost:3001/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.role) setUserRole(data.user.role);
                })
                .catch(err => console.error(err));
        }
    }, []);

    return (
        <nav
            className={`${isCollapsed ? 'w-20' : 'w-64'
                } bg-gray-900 text-white p-4 h-screen hidden md:flex flex-col border-r border-gray-800 transition-all duration-300 relative z-50`}
        >
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-6 bg-gray-800 text-gray-400 hover:text-white p-1 rounded-full border border-gray-700 shadow-lg z-10"
            >
                {isCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                )}
            </button>

            <div className={`mb-8 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                <h1 className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'text-xl' : 'text-2xl'
                    }`}>
                    {isCollapsed ? 'WS' : 'WhatsApp SaaS'}
                </h1>
            </div>

            <ul className="space-y-2 flex-grow">
                <li>
                    <Link
                        href="/dashboard"
                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                        title={isCollapsed ? "Connect Device" : ""}
                    >
                        <span className="text-xl">📱</span>
                        {!isCollapsed && <span className="ml-3 font-medium">Connect Device</span>}
                    </Link>
                </li>
                <li>
                    <Link
                        href="/dashboard/chats"
                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive('/dashboard/chats') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                        title={isCollapsed ? "Chats" : ""}
                    >
                        <span className="text-xl">💬</span>
                        {!isCollapsed && <span className="ml-3 font-medium">Chats</span>}
                    </Link>
                </li>
                <li>
                    <Link
                        href="/dashboard/logs"
                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive('/dashboard/logs') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                        title={isCollapsed ? "Logs & Activity" : ""}
                    >
                        <span className="text-xl">📊</span>
                        {!isCollapsed && <span className="ml-3 font-medium">Logs & Activity</span>}
                    </Link>
                </li>
                <li>
                    <Link
                        href="/dashboard/playground"
                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-all font-mono text-sm border ${isActive('/dashboard/playground')
                            ? 'bg-blue-900/40 text-blue-200 border-blue-500/50'
                            : 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 text-blue-300 border-blue-900/50 hover:bg-blue-900/30'
                            }`}
                        title={isCollapsed ? "API Playground" : ""}
                    >
                        <span className="text-xl">🧪</span>
                        {!isCollapsed && <span className="ml-3 font-medium">API Playground</span>}
                    </Link>
                </li>
                <li>
                    <Link
                        href="/dashboard/docs"
                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive('/dashboard/docs') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                        title={isCollapsed ? "API Docs" : ""}
                    >
                        <span className="text-xl">📚</span>
                        {!isCollapsed && <span className="ml-3 font-medium">API Docs</span>}
                    </Link>
                </li>

                {userRole === 'admin' && (
                    <li>
                        <Link
                            href="/dashboard/admin"
                            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive('/dashboard/admin') ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                            title={isCollapsed ? "Administration" : ""}
                        >
                            <span className="text-xl">🛡️</span>
                            {!isCollapsed && <span className="ml-3 font-medium">Administration</span>}
                        </Link>
                    </li>
                )}

                <li>
                    <Link
                        href="/dashboard/settings"
                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive('/dashboard/settings') ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                        title={isCollapsed ? "Settings" : ""}
                    >
                        <span className="text-xl">⚙️</span>
                        {!isCollapsed && <span className="ml-3 font-medium">Settings</span>}
                    </Link>
                </li>
            </ul>

            <div className={`mt-auto border-t border-gray-800 pt-4 flex ${isCollapsed ? 'justify-center' : ''}`}>
                <Link
                    href="/"
                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors`}
                    title={isCollapsed ? "Logout" : ""}
                >
                    <span className="text-xl">🚪</span>
                    {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
                </Link>
            </div>
        </nav>
    );
}
