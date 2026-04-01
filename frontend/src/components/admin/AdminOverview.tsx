import type { AdminStats } from '@/lib/api/admin';
import Panel from '@/components/ui/Panel';

interface AdminOverviewProps {
    stats: AdminStats | null;
    loading?: boolean;
    openSecurityIssues: number;
}

export default function AdminOverview({ stats, loading = false, openSecurityIssues }: AdminOverviewProps) {
    const totalUsers = stats?.users ?? 0;
    const totalRequests = stats?.totalRequests ?? 0;
    const totalErrors = stats?.errors ?? 0;

    return (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Panel className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Total users</p>
                <p className="mt-2 text-3xl font-bold text-white">{loading ? '...' : totalUsers}</p>
            </Panel>
            <Panel className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Total requests</p>
                <p className="mt-2 text-3xl font-bold text-white">{loading ? '...' : totalRequests}</p>
            </Panel>
            <Panel className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Request errors</p>
                <p className="mt-2 text-3xl font-bold text-white">{loading ? '...' : totalErrors}</p>
            </Panel>
            <Panel className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Open security issues</p>
                <p className="mt-2 text-3xl font-bold text-amber-300">{loading ? '...' : openSecurityIssues}</p>
            </Panel>
        </section>
    );
}
