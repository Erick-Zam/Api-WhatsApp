'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiRequest, getStoredToken } from '@/lib/api/client';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';

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
    badge?: string;
    title?: string;
}

const SidebarItem = ({ href, icon, label, isCollapsed, isActive, customClasses, badge, title }: SidebarLinkProps) => (
    <li>
        <Link
            href={href}
            className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3.5'} py-2.5 rounded-xl transition-all ${
                customClasses || (isActive
                    ? 'surface-card--elevated text-slate-50'
                    : 'text-slate-300 hover:bg-slate-900/80 hover:text-white')
            }`}
            title={isCollapsed ? (title || label) : ""}
        >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${isActive ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-200' : 'border-slate-700/70 bg-slate-900/80 text-slate-300 group-hover:border-slate-600'}`}>
                {icon}
            </span>
            {!isCollapsed && (
                <>
                    <span className="ml-3 flex-1 text-sm font-medium">{label}</span>
                    {badge && <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">{badge}</span>}
                </>
            )}
        </Link>
    </li>
);

const IconGrid = 'DB';
const IconChat = 'CH';
const IconChart = 'LG';
const IconFlask = 'AP';
const IconBook = 'DC';
const IconShield = 'AD';
const IconGear = 'ST';
const IconDoor = 'LO';

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
        <nav className={`${isCollapsed ? 'w-24' : 'w-72'} relative z-50 hidden h-[100dvh] flex-col overflow-hidden border-r border-slate-800/80 bg-slate-950/85 p-4 text-white backdrop-blur transition-all duration-300 md:flex`}>
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-6 z-10 rounded-full border border-slate-700 bg-slate-900 p-1 text-slate-400 shadow-lg hover:text-white"
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

            <div className={`mb-4 rounded-2xl border border-slate-800/90 bg-slate-900/70 px-3 py-3 ${isCollapsed ? 'items-center' : ''}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <h1 className={`whitespace-nowrap overflow-hidden font-bold text-gradient-brand transition-all duration-300 ${isCollapsed ? 'text-xl' : 'text-2xl'}`}>
                        {isCollapsed ? 'WS' : 'WhatsApp SaaS'}
                    </h1>
                    {!isCollapsed && <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">Live</span>}
                </div>
            </div>

            {!isCollapsed && (
                <div className="mb-4 rounded-2xl surface-card p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Session Health</span>
                        <span className={`h-2 w-2 rounded-full ${healthColor}`} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{healthLabel}</p>
                    <p className="text-xs text-slate-500">Connected: {connectedCount} - Alerts: {unhealthyCount}</p>
                </div>
            )}

            <div className="sidebar-scroll app-scroll min-h-0 flex-grow overflow-y-auto pr-2">
                <ul className="space-y-1.5">
                    <SidebarItem href="/dashboard" icon={IconGrid} label="Connect Device" isCollapsed={isCollapsed} isActive={isActive('/dashboard')} />
                    <SidebarItem href="/dashboard/chats" icon={IconChat} label="Chats" isCollapsed={isCollapsed} isActive={isActive('/dashboard/chats')} />
                    <SidebarItem href="/dashboard/logs" icon={IconChart} label="Logs & Activity" isCollapsed={isCollapsed} isActive={isActive('/dashboard/logs')} />

                    <SidebarItem
                        href="/dashboard/playground"
                        icon={IconFlask}
                        label="API Playground"
                        isCollapsed={isCollapsed}
                        isActive={isActive('/dashboard/playground')}
                        badge="LAB"
                        customClasses={isActive('/dashboard/playground')
                            ? 'surface-card--elevated text-slate-50'
                            : 'surface-card text-cyan-100/85 hover:brightness-110'
                        }
                    />

                    <SidebarItem href="/dashboard/docs" icon={IconBook} label="API Docs" isCollapsed={isCollapsed} isActive={isActive('/dashboard/docs')} />

                    {userRole === 'admin' && (
                        <SidebarItem
                            href="/dashboard/admin"
                            icon={IconShield}
                            label="Administration"
                            isCollapsed={isCollapsed}
                            isActive={isActive('/dashboard/admin')}
                            customClasses={isActive('/dashboard/admin')
                                ? 'surface-card--elevated text-slate-50'
                                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                            }
                        />
                    )}

                    <SidebarItem href="/dashboard/settings" icon={IconGear} label="Settings" isCollapsed={isCollapsed} isActive={isActive('/dashboard/settings')} />
                </ul>
            </div>

            <div className={`mt-3 border-t border-slate-800 pt-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
                {!isCollapsed && <div className="mb-3"><ThemeSwitcher /></div>}
                <button
                    onClick={logout}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3.5'} rounded-xl py-2.5 text-left text-rose-300 transition-colors hover:bg-rose-500/10`}
                    title={isCollapsed ? "Logout" : ""}
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/25 bg-rose-400/10 text-[11px] font-semibold tracking-wide">{IconDoor}</span>
                    {!isCollapsed && <span className="ml-3 text-sm font-medium">Logout</span>}
                </button>
            </div>
        </nav>
    );
}
