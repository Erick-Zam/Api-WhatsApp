'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiRequest, getStoredToken } from '@/lib/api/client';

interface SessionHealth {
    id: string;
    status: string;
    engineType?: string;
    healthStatus?: string;
}

interface SidebarLinkProps {
    href: string;
    icon: string;
    label: string;
    isCollapsed: boolean;
    isActive: boolean;
    customClasses?: string;
    title?: string;
}

const SidebarItem = ({ href, icon, label, isCollapsed, isActive, customClasses, title }: SidebarLinkProps) => (
    <li>
        <Link
            href={href}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-all ${
                customClasses || (isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white')
            }`}
            title={isCollapsed ? (title || label) : ""}
        >
            <span className="text-xl">{icon}</span>
            {!isCollapsed && <span className="ml-3 font-medium">{label}</span>}
        </Link>
    </li>
);

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [sessions, setSessions] = useState<SessionHealth[]>([]);

    const isActive = (path: string) => pathname === path;

    useEffect(() => {
        const token = getStoredToken();
        if (token) {
            const loadSidebarData = async () => {
                try {
                    const [meData, sessionsData] = await Promise.all([
                        apiRequest<{ user?: { role?: string } }>('/auth/me', { token }),
                        apiRequest<SessionHealth[]>('/sessions', { token }),
                    ]);

                    if (meData.user?.role) {
                        setUserRole(meData.user.role);
                    }

                    if (Array.isArray(sessionsData)) {
                        setSessions(sessionsData);
                    }
                } catch {
                    setSessions([]);
                }
            };

            loadSidebarData();
            const interval = setInterval(loadSidebarData, 30000);
            return () => clearInterval(interval);
        }
    }, []);

    const connectedCount = sessions.filter((s) => s.status === 'CONNECTED').length;
    const unhealthyCount = sessions.filter((s) => {
        const health = (s.healthStatus || 'unknown').toLowerCase();
        return health === 'degraded' || health === 'unhealthy' || health === 'error';
    }).length;
    const healthLabel = unhealthyCount > 0 ? 'Degraded' : connectedCount > 0 ? 'Healthy' : 'Unknown';
    const healthColor = unhealthyCount > 0
        ? 'bg-rose-400'
        : connectedCount > 0
            ? 'bg-emerald-400'
            : 'bg-zinc-500';

    const logout = () => {
        localStorage.removeItem('token');
        globalThis.location.href = '/';
    };

    return (
        <nav
            className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-900 text-white p-4 h-screen hidden md:flex flex-col border-r border-gray-800 transition-all duration-300 relative z-50`}
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
                <h1 className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'text-xl' : 'text-2xl'}`}>
                    {isCollapsed ? 'WS' : 'WhatsApp SaaS'}
                </h1>
            </div>

            {!isCollapsed && (
                <div className="mb-4 rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-gray-400">Session Health</span>
                        <span className={`h-2 w-2 rounded-full ${healthColor}`} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-100">{healthLabel}</p>
                    <p className="text-xs text-gray-500">Connected: {connectedCount} · Alerts: {unhealthyCount}</p>
                </div>
            )}

            <ul className="space-y-2 flex-grow">
                <SidebarItem href="/dashboard" icon="📱" label="Connect Device" isCollapsed={isCollapsed} isActive={isActive('/dashboard')} />
                <SidebarItem href="/dashboard/chats" icon="💬" label="Chats" isCollapsed={isCollapsed} isActive={isActive('/dashboard/chats')} />
                <SidebarItem href="/dashboard/logs" icon="📊" label="Logs & Activity" isCollapsed={isCollapsed} isActive={isActive('/dashboard/logs')} />
                
                <SidebarItem 
                    href="/dashboard/playground" 
                    icon="🧪" 
                    label="API Playground" 
                    isCollapsed={isCollapsed} 
                    isActive={isActive('/dashboard/playground')}
                    customClasses={isActive('/dashboard/playground')
                        ? 'bg-blue-900/40 text-blue-200 border-blue-500/50'
                        : 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 text-blue-300 border-blue-900/50 hover:bg-blue-900/30'
                    }
                />

                <SidebarItem href="/dashboard/docs" icon="📚" label="API Docs" isCollapsed={isCollapsed} isActive={isActive('/dashboard/docs')} />

                {userRole === 'admin' && (
                    <SidebarItem 
                        href="/dashboard/admin" 
                        icon="🛡️" 
                        label="Administration" 
                        isCollapsed={isCollapsed} 
                        isActive={isActive('/dashboard/admin')}
                        customClasses={isActive('/dashboard/admin') 
                            ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30' 
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }
                    />
                )}

                <SidebarItem href="/dashboard/settings" icon="⚙️" label="Settings" isCollapsed={isCollapsed} isActive={isActive('/dashboard/settings')} />
            </ul>

            <div className={`mt-auto border-t border-gray-800 pt-4 flex ${isCollapsed ? 'justify-center' : ''}`}>
                <button
                    onClick={logout}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors text-left`}
                    title={isCollapsed ? "Logout" : ""}
                >
                    <span className="text-xl">🚪</span>
                    {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
                </button>
            </div>
        </nav>
    );
}
