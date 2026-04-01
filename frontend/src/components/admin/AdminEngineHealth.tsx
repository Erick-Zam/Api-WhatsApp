import type { AdminEngineHealthResponse } from '@/lib/api/admin';
import Panel from '@/components/ui/Panel';

interface AdminEngineHealthProps {
    data: AdminEngineHealthResponse | null;
    loading?: boolean;
}

export default function AdminEngineHealth({ data, loading = false }: AdminEngineHealthProps) {
    const totals = data?.totals || [];
    const breakdown = data?.healthBreakdown || [];
    const metrics = data?.recentMetrics || [];

    return (
        <Panel elevated className="overflow-hidden">
            <div className="border-b border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] px-5 py-4">
                <h3 className="text-lg font-bold theme-text-main">Engine health</h3>
                <p className="mt-1 text-sm theme-text-muted">Session health and latency by engine type.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
                <div className="theme-card-strong rounded-xl p-4">
                    <p className="theme-text-soft text-xs uppercase tracking-wide">Totals</p>
                    {loading && <p className="theme-text-soft mt-2 text-sm">Loading...</p>}
                    {!loading && totals.length === 0 && <p className="theme-text-soft mt-2 text-sm">No engine totals.</p>}
                    {!loading && totals.length > 0 && (
                        <ul className="mt-2 space-y-2 text-sm">
                            {totals.map((item) => (
                                <li key={`${item.engine_type}-total`} className="flex items-center justify-between theme-text-muted">
                                    <span className="font-semibold">{item.engine_type}</span>
                                    <span>{item.connected_sessions}/{item.total_sessions}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="theme-card-strong rounded-xl p-4">
                    <p className="theme-text-soft text-xs uppercase tracking-wide">Health status</p>
                    {loading && <p className="theme-text-soft mt-2 text-sm">Loading...</p>}
                    {!loading && breakdown.length === 0 && <p className="theme-text-soft mt-2 text-sm">No status breakdown.</p>}
                    {!loading && breakdown.length > 0 && (
                        <ul className="mt-2 space-y-2 text-sm">
                            {breakdown.map((item) => (
                                <li key={`${item.engine_type}-${item.health_status}`} className="flex items-center justify-between theme-text-muted">
                                    <span>{item.engine_type} · {item.health_status}</span>
                                    <span>{item.count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="theme-card-strong rounded-xl p-4">
                    <p className="theme-text-soft text-xs uppercase tracking-wide">Recent metrics</p>
                    {loading && <p className="theme-text-soft mt-2 text-sm">Loading...</p>}
                    {!loading && metrics.length === 0 && <p className="theme-text-soft mt-2 text-sm">No latency metrics.</p>}
                    {!loading && metrics.length > 0 && (
                        <ul className="mt-2 space-y-2 text-sm">
                            {metrics.map((item) => (
                                <li key={`${item.engine_type}-metric`} className="theme-text-muted">
                                    <p className="font-semibold">{item.engine_type}</p>
                                    <p className="text-xs theme-text-soft">
                                        Latency: {item.avg_latency_ms ?? '-'} ms · Error rate: {item.avg_error_rate ?? '-'} · Uptime: {item.avg_uptime_percent ?? '-'}%
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {data?.warning && (
                <div className="border-t border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] bg-amber-500/10 px-5 py-3 text-xs text-amber-400">
                    {data.warning}
                </div>
            )}
        </Panel>
    );
}
