import Sidebar from '@/components/Sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <div className="flex h-[100dvh] overflow-hidden bg-transparent">
            <Sidebar />

            <main className="app-scroll relative h-full w-full flex-1 overflow-y-auto bg-transparent p-5 md:p-8 lg:p-10">
                {children}
            </main>
        </div>
    );
}
