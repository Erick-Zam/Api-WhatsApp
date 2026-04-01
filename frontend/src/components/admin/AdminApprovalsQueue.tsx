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
        <Panel className="overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-4">
                <h3 className="text-lg font-bold text-white">Approvals queue</h3>
                <p className="mt-1 text-sm text-zinc-400">Review and decide pending administrative actions.</p>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-5 py-4">
                {loading && <p className="text-sm text-zinc-500">Loading approvals...</p>}
                {!loading && approvals.length === 0 && <p className="text-sm text-zinc-500">No pending approvals.</p>}

                <ul className="space-y-3">
                    {approvals.map((approval) => {
                        const isPending = approval.status === 'PENDING';
                        const isBusy = actionApprovalId === approval.id;

                        return (
                            <li key={approval.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-zinc-100">{approval.action_type}</p>
                                    <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                            approval.status === 'APPROVED'
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : approval.status === 'REJECTED'
                                                    ? 'bg-red-500/20 text-red-300'
                                                    : 'bg-amber-500/20 text-amber-300'
                                        }`}
                                    >
                                        {approval.status}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-zinc-400">
                                    Requested {formatDateRelative(approval.requested_at)} · Target: {approval.target_user_id || '-'}
                                </p>

                                {approval.reason && <p className="mt-1 text-xs text-zinc-500">Reason: {approval.reason}</p>}

                                <p className="mt-1 text-[11px] text-zinc-500" title={formatDateFull(approval.requested_at)}>
                                    {formatDateFull(approval.requested_at)}
                                </p>

                                {isPending && (
                                    <div className="mt-3 flex gap-2">
                                        <Button
                                            variant="primary"
                                            onClick={() => onApprove(approval)}
                                            disabled={isBusy}
                                            className="px-3 py-2 text-xs"
                                        >
                                            {isBusy ? 'Processing...' : 'Approve'}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={() => onReject(approval)}
                                            disabled={isBusy}
                                            className="px-3 py-2 text-xs"
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
