import type { AuditEvent, SecurityEvent } from '@/lib/api/admin';
import Panel from '@/components/ui/Panel';
import { formatDateFull, formatDateRelative } from '@/lib/format/date';

interface AdminSecurityFeedProps {
    auditEvents: AuditEvent[];
    securityEvents: SecurityEvent[];
    loading?: boolean;
}

const severityClassMap: Record<string, string> = {
    low: 'bg-emerald-500/20 text-emerald-300',
    medium: 'bg-amber-500/20 text-amber-300',
    high: 'bg-orange-500/20 text-orange-300',
    critical: 'bg-red-500/20 text-red-300',
};

export default function AdminSecurityFeed({ auditEvents, securityEvents, loading = false }: AdminSecurityFeedProps) {
    return (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel className="overflow-hidden">
                <div className="border-b border-zinc-800 px-5 py-4">
                    <h3 className="text-lg font-bold text-white">Audit events</h3>
                    <p className="mt-1 text-sm text-zinc-400">Latest compliance and admin actions.</p>
                </div>
                <div className="max-h-[420px] overflow-y-auto px-5 py-4">
                    {loading && <p className="text-sm text-zinc-500">Loading audit events...</p>}
                    {!loading && auditEvents.length === 0 && <p className="text-sm text-zinc-500">No recent audit events.</p>}
                    <ul className="space-y-3">
                        {auditEvents.map((event) => (
                            <li key={event.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-zinc-100">{event.event_type}</p>
                                    <span className="text-xs text-zinc-400" title={formatDateFull(event.timestamp)}>
                                        {formatDateRelative(event.timestamp)}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Action: {event.action} · Status: {event.status}
                                </p>
                                {event.entity_id && <p className="mt-1 text-xs text-zinc-500">Entity: {event.entity_id}</p>}
                            </li>
                        ))}
                    </ul>
                </div>
            </Panel>

            <Panel className="overflow-hidden">
                <div className="border-b border-zinc-800 px-5 py-4">
                    <h3 className="text-lg font-bold text-white">Security events</h3>
                    <p className="mt-1 text-sm text-zinc-400">Open incidents and suspicious activity.</p>
                </div>
                <div className="max-h-[420px] overflow-y-auto px-5 py-4">
                    {loading && <p className="text-sm text-zinc-500">Loading security events...</p>}
                    {!loading && securityEvents.length === 0 && <p className="text-sm text-zinc-500">No security incidents detected.</p>}
                    <ul className="space-y-3">
                        {securityEvents.map((event) => {
                            const severityKey = (event.severity || 'low').toLowerCase();
                            return (
                                <li key={event.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-zinc-100">{event.event_type}</p>
                                        <span
                                            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                                severityClassMap[severityKey] || severityClassMap.low
                                            }`}
                                        >
                                            {severityKey}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-400">{event.description || 'No description provided.'}</p>
                                    <p className="mt-2 text-xs text-zinc-500" title={formatDateFull(event.timestamp)}>
                                        {formatDateRelative(event.timestamp)} · {event.email || 'Unknown user'}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </Panel>
        </section>
    );
}
