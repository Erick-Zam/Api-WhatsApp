import type { Chat } from './types';
import { formatChatTime } from './types';

interface ChatDetailsPanelProps {
    selectedChat: string;
    selectedSession: string;
    currentChat?: Chat;
}

export default function ChatDetailsPanel({ selectedChat, selectedSession, currentChat }: ChatDetailsPanelProps) {
    return (
        <aside className="hidden xl:flex w-80 flex-col border-l border-zinc-800/60 bg-zinc-950">
            <div className="h-16 border-b border-zinc-800/60 px-6 flex items-center">
                <h3 className="font-semibold">Details</h3>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
                <div className="text-center">
                    <div className={`mx-auto mb-2 h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold ${currentChat?.isGroup ? 'bg-emerald-600' : 'bg-cyan-600'}`}>
                        {(currentChat?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold">{currentChat?.name || selectedChat}</p>
                    <p className="text-xs text-zinc-500">{currentChat?.isGroup ? 'Group chat' : 'Direct chat'}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Session</p>
                    <p className="text-sm text-zinc-200">{selectedSession}</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Last activity</p>
                    <p className="text-sm text-zinc-200">{formatChatTime(currentChat?.conversationTimestamp) || 'Unknown'}</p>
                </div>
            </div>
        </aside>
    );
}
