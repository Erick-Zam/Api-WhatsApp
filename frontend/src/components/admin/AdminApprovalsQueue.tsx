import type { AdminApproval } from '@/lib/api/admin';
import Panel from '@/components/ui/Panel';
import Button from '@/components/ui/Button';
import { formatDateFull, formatDateRelative } from '@/lib/format/date';

interface AdminApprovalsQueueProps {
    approvals: AdminApproval[];
    loading?: boolean;
    actionApprovalId?: string;
    onApprove: (approval: AdminApproval) => void;
    onReject: (approval: AdminApproval) => void;
}

export default function AdminApprovalsQueue({
    approvals,
    loading = false,
    actionApprovalId = '',
    onApprove,
    onReject,
}: AdminApprovalsQueueProps) {
    return (
        <Panel elevated className="overflow-hidden">
            <div className="border-b border-[color:color-mix(in_srgb,var(--border-soft)_88%,transparent)] px-5 py-4">
                <h3 className="text-lg font-bold theme-text-main">Approvals queue</h3>
                <p className="mt-1 text-sm theme-text-muted">Review and decide pending administrative actions.</p>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-5 py-4">
                {loading && <p className="theme-text-soft text-sm">Loading approvals...</p>}
                {!loading && approvals.length === 0 && <p className="theme-text-soft text-sm">No pending approvals.</p>}

                <ul className="space-y-3">
                    {approvals.map((approval) => {
                        const isPending = approval.status === 'PENDING';
                        const isBusy = actionApprovalId === approval.id;

                        return (
                            <li key={approval.id} className="theme-card-strong rounded-xl p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold theme-text-main">{approval.action_type}</p>
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                            approval.status === 'APPROVED'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : approval.status === 'REJECTED'
                                                    ? 'bg-red-500/20 text-rose-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                        }`}
                                    >
                                        {approval.status}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs theme-text-muted">
                                    Requested {formatDateRelative(approval.requested_at)} · Target: {approval.target_user_id || '-'}
                                </p>

                                {approval.reason && <p className="mt-1 text-xs theme-text-soft">Reason: {approval.reason}</p>}

                                <p className="mt-1 text-[11px] theme-text-soft" title={formatDateFull(approval.requested_at)}>
                                    {formatDateFull(approval.requested_at)}
                                </p>

                                {isPending && (
                                    <div className="mt-3 flex gap-2">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => onApprove(approval)}
                                            disabled={isBusy}
                                        >
                                            {isBusy ? 'Processing...' : 'Approve'}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => onReject(approval)}
                                            disabled={isBusy}
                                        >
                                            {isBusy ? 'Processing...' : 'Reject'}
                                        </Button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </Panel>
    );
}
