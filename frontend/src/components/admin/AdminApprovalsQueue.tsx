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
            <div className="border-b border-slate-800 px-5 py-4">
                <h3 className="text-lg font-bold text-slate-100">Approvals queue</h3>
                <p className="mt-1 text-sm text-slate-400">Review and decide pending administrative actions.</p>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-5 py-4">
                {loading && <p className="text-sm text-slate-500">Loading approvals...</p>}
                {!loading && approvals.length === 0 && <p className="text-sm text-slate-500">No pending approvals.</p>}

                <ul className="space-y-3">
                    {approvals.map((approval) => {
                        const isPending = approval.status === 'PENDING';
                        const isBusy = actionApprovalId === approval.id;

                        return (
                            <li key={approval.id} className="rounded-xl border border-slate-800 bg-slate-900/65 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-100">{approval.action_type}</p>
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                            approval.status === 'APPROVED'
                                                ? 'bg-emerald-500/20 text-emerald-200'
                                                : approval.status === 'REJECTED'
                                                    ? 'bg-red-500/20 text-rose-200'
                                                    : 'bg-amber-500/20 text-amber-200'
                                        }`}
                                    >
                                        {approval.status}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-slate-400">
                                    Requested {formatDateRelative(approval.requested_at)} · Target: {approval.target_user_id || '-'}
                                </p>

                                {approval.reason && <p className="mt-1 text-xs text-slate-500">Reason: {approval.reason}</p>}

                                <p className="mt-1 text-[11px] text-slate-500" title={formatDateFull(approval.requested_at)}>
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
