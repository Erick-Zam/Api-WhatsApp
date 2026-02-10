import Sidebar from '@/components/Sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-black">
            <Sidebar />

            <main className="flex-1 relative w-full h-full bg-gray-50 dark:bg-black overflow-hidden">
                {children}
            </main>
        </div>
    );
}
