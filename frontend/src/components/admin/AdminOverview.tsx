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
            <Panel elevated className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total users</p>
                <p className="mt-2 text-3xl font-bold text-slate-100">{loading ? '...' : totalUsers}</p>
            </Panel>
            <Panel elevated className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total requests</p>
                <p className="mt-2 text-3xl font-bold text-slate-100">{loading ? '...' : totalRequests}</p>
            </Panel>
            <Panel elevated className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Request errors</p>
                <p className="mt-2 text-3xl font-bold text-rose-200">{loading ? '...' : totalErrors}</p>
            </Panel>
            <Panel elevated className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Open security issues</p>
                <p className="mt-2 text-3xl font-bold text-amber-200">{loading ? '...' : openSecurityIssues}</p>
            </Panel>
        </section>
    );
}
