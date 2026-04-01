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
                <p className="theme-text-muted text-xs uppercase tracking-[0.16em]">Total users</p>
                <p className="mt-2 text-3xl font-bold theme-text-main">{loading ? '...' : totalUsers}</p>
            </Panel>
            <Panel elevated className="p-5">
                <p className="theme-text-muted text-xs uppercase tracking-[0.16em]">Total requests</p>
                <p className="mt-2 text-3xl font-bold theme-text-main">{loading ? '...' : totalRequests}</p>
            </Panel>
            <Panel elevated className="p-5">
                <p className="theme-text-muted text-xs uppercase tracking-[0.16em]">Request errors</p>
                <p className="mt-2 text-3xl font-bold text-rose-200">{loading ? '...' : totalErrors}</p>
            </Panel>
            <Panel elevated className="p-5">
                <p className="theme-text-muted text-xs uppercase tracking-[0.16em]">Open security issues</p>
                <p className="mt-2 text-3xl font-bold text-amber-200">{loading ? '...' : openSecurityIssues}</p>
            </Panel>
        </section>
    );
}
