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
        <Panel className="overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-4">
                <h3 className="text-lg font-bold text-white">Engine health</h3>
                <p className="mt-1 text-sm text-zinc-400">Session health and latency by engine type.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Totals</p>
                    {loading && <p className="mt-2 text-sm text-zinc-500">Loading...</p>}
                    {!loading && totals.length === 0 && <p className="mt-2 text-sm text-zinc-500">No engine totals.</p>}
                    {!loading && totals.length > 0 && (
                        <ul className="mt-2 space-y-2 text-sm">
                            {totals.map((item) => (
                                <li key={`${item.engine_type}-total`} className="flex items-center justify-between text-zinc-300">
                                    <span className="font-semibold">{item.engine_type}</span>
                                    <span>{item.connected_sessions}/{item.total_sessions}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Health status</p>
                    {loading && <p className="mt-2 text-sm text-zinc-500">Loading...</p>}
                    {!loading && breakdown.length === 0 && <p className="mt-2 text-sm text-zinc-500">No status breakdown.</p>}
                    {!loading && breakdown.length > 0 && (
                        <ul className="mt-2 space-y-2 text-sm">
                            {breakdown.map((item) => (
                                <li key={`${item.engine_type}-${item.health_status}`} className="flex items-center justify-between text-zinc-300">
                                    <span>{item.engine_type} · {item.health_status}</span>
                                    <span>{item.count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Recent metrics</p>
                    {loading && <p className="mt-2 text-sm text-zinc-500">Loading...</p>}
                    {!loading && metrics.length === 0 && <p className="mt-2 text-sm text-zinc-500">No latency metrics.</p>}
                    {!loading && metrics.length > 0 && (
                        <ul className="mt-2 space-y-2 text-sm">
                            {metrics.map((item) => (
                                <li key={`${item.engine_type}-metric`} className="text-zinc-300">
                                    <p className="font-semibold">{item.engine_type}</p>
                                    <p className="text-xs text-zinc-400">
                                        Latency: {item.avg_latency_ms ?? '-'} ms · Error rate: {item.avg_error_rate ?? '-'} · Uptime: {item.avg_uptime_percent ?? '-'}%
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {data?.warning && (
                <div className="border-t border-zinc-800 bg-amber-500/10 px-5 py-3 text-xs text-amber-200">
                    {data.warning}
                </div>
            )}
        </Panel>
    );
}
