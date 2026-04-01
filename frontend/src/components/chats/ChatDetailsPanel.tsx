import type { Chat } from './types';
import { formatChatTime } from './types';

interface ChatDetailsPanelProps {
    selectedChat: string;
    selectedSession: string;
    currentChat?: Chat;
}

export default function ChatDetailsPanel({ selectedChat, selectedSession, currentChat }: ChatDetailsPanelProps) {
    return (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-slate-800/70 bg-slate-950/75 p-4 xl:flex">
            <div className="rounded-2xl surface-card--elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Conversation</p>
                <h3 className="mt-1 text-base font-semibold text-slate-100">Details</h3>
            </div>

            <div className="mt-4 space-y-4 overflow-y-auto">
                <div className="rounded-2xl surface-card p-5 text-center">
                    <div className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold ${currentChat?.isGroup ? 'bg-emerald-500/80 text-white' : 'bg-cyan-400 text-slate-950'}`}>
                        {(currentChat?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold text-slate-100">{currentChat?.name || selectedChat}</p>
                    <p className="text-xs text-slate-500">{currentChat?.isGroup ? 'Group chat' : 'Direct chat'}</p>
                </div>

                <div className="rounded-2xl surface-card p-4">
                    <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">Session</p>
                    <p className="text-sm text-slate-200">{selectedSession}</p>
                </div>

                <div className="rounded-2xl surface-card p-4">
                    <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">Last activity</p>
                    <p className="text-sm text-slate-200">{formatChatTime(currentChat?.conversationTimestamp) || 'Unknown'}</p>
                </div>

                <div className="rounded-2xl surface-card p-4">
                    <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">Thread id</p>
                    <p className="break-all text-xs text-slate-400">{selectedChat}</p>
                </div>
            </div>
        </aside>
    );
}
