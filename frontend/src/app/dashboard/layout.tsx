import Link from 'next/link';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            {/* Dashboard Sidebar */}
            <nav className="w-64 bg-gray-900 text-white p-6 hidden md:flex flex-col border-r border-gray-800">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        WhatsApp SaaS
                    </h1>
                </div>

                <ul className="space-y-2 flex-grow">
                    <li>
                        <Link href="/dashboard" className="block px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                            📱 Connect Device
                        </Link>
                    </li>
                    <li>
                        <Link href="/dashboard/logs" className="block px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                            📊 Logs & Activity
                        </Link>
                    </li>
                    <li>
                        <Link href="/dashboard/settings" className="block px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                            ⚙️ Settings
                        </Link>
                    </li>
                    <li>
                        <Link href="/docs" className="block px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                            📚 API Docs
                        </Link>
                    </li>
                    <li>
                        <Link href="/dashboard/playground" className="block px-4 py-3 rounded-lg bg-gradient-to-r from-blue-900/20 to-purple-900/20 text-blue-300 border border-blue-900/50 hover:bg-blue-900/30 transition-all font-mono text-sm">
                            🧪 API Playground
                        </Link>
                    </li>
                </ul>

                <div className="mt-auto border-t border-gray-800 pt-4">
                    <Link href="/" className="block px-4 py-3 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors">
                        Logout
                    </Link>
                </div>
            </nav>

            {/* Content Area */}
            <main className="flex-1 p-8 md:p-12 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
