import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import type { Chat, WASession } from './types';
import { formatChatTime } from './types';

interface ChatRailContentProps {
    sessions: WASession[];
    selectedSession: string;
    onSelectSession: (sessionId: string) => void;
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    chats: Chat[];
    selectedChat: string | null;
    onSelectChat: (chatId: string) => void;
    loadingChats: boolean;
    onAfterSelectChat?: () => void;
}

export default function ChatRailContent({
    sessions,
    selectedSession,
    onSelectSession,
    searchTerm,
    onSearchTermChange,
    chats,
    selectedChat,
    onSelectChat,
    loadingChats,
    onAfterSelectChat,
}: ChatRailContentProps) {
    return (
        <div className="flex h-full min-h-0 flex-col gap-2.5">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Session</p>
                <select
                    value={selectedSession}
                    onChange={(e) => onSelectSession(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                >
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.id} ({s.status})
                        </option>
                    ))}
                </select>
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                <label className="flex h-11 items-center rounded-xl border border-slate-700 bg-slate-900/70 px-3">
                    <MagnifyingGlassIcon className="h-4 w-4 text-slate-500" />
                    <input
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        className="ml-2 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        placeholder="Search by name or number"
                    />
                </label>
            </div>

            <div className="app-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {loadingChats && <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3 text-sm text-slate-400">Loading chats...</div>}
                {!loadingChats && chats.length === 0 && <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3 text-sm text-slate-500">No chats found.</div>}

                {chats.map((chat) => {
                    const active = selectedChat === chat.id;
                    return (
                        <button
                            key={chat.id}
                            onClick={() => {
                                onSelectChat(chat.id);
                                onAfterSelectChat?.();
                            }}
                            className={`w-full rounded-2xl border p-3 text-left transition ${
                                active
                                    ? 'border-cyan-300/35 bg-gradient-to-r from-cyan-400/20 to-blue-500/15 shadow-[0_8px_30px_rgba(14,165,233,0.2)]'
                                    : 'border-slate-700/80 bg-slate-900/65 hover:border-slate-600 hover:bg-slate-900/90'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${chat.isGroup ? 'bg-emerald-500/80 text-white' : 'bg-cyan-500/85 text-slate-950'}`}>
                                    {(chat.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-100">{chat.name || chat.id}</p>
                                        <span className="text-[10px] text-slate-500">{formatChatTime(chat.conversationTimestamp)}</span>
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-slate-400">{chat.lastMessage || 'No messages yet'}</p>
                                </div>
                                {!!chat.unreadCount && (
                                    <span className="rounded-full border border-cyan-300/35 bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
                                        {chat.unreadCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
