import Sidebar from '@/components/Sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-black">
            <Sidebar />

            <main className="flex-1 relative w-full h-full bg-gray-50 dark:bg-black overflow-y-auto p-6 md:p-10">
                {children}
            </main>
        </div>
    );
}
