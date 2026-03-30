import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import type { Chat, WASession } from './types';
import { formatChatTime } from './types';

interface ChatListProps {
    sessions: WASession[];
    selectedSession: string;
    onSelectSession: (sessionId: string) => void;
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    chats: Chat[];
    selectedChat: string | null;
    onSelectChat: (chatId: string) => void;
    loadingChats: boolean;
}

export default function ChatList({
    sessions,
    selectedSession,
    onSelectSession,
    searchTerm,
    onSearchTermChange,
    chats,
    selectedChat,
    onSelectChat,
    loadingChats,
}: ChatListProps) {
    return (
        <aside className="hidden lg:flex w-80 flex-col border-r border-zinc-800/60 bg-zinc-950">
            <div className="p-4 border-b border-zinc-800/60">
                <h2 className="text-lg font-bold text-cyan-400">Chats</h2>
            </div>
            <div className="p-3 border-b border-zinc-800/40">
                <select
                    value={selectedSession}
                    onChange={(e) => onSelectSession(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                >
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.id} ({s.status})
                        </option>
                    ))}
                </select>
            </div>
            <div className="p-3 border-b border-zinc-800/40">
                <div className="flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3">
                    <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
                    <input
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        className="ml-2 w-full bg-transparent text-sm outline-none"
                        placeholder="Search"
                    />
                </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {loadingChats && <div className="p-3 text-sm text-zinc-400">Loading chats...</div>}
                {!loadingChats && chats.length === 0 && <div className="p-3 text-sm text-zinc-500">No chats found</div>}
                {chats.map((chat) => (
                    <button
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                            selectedChat === chat.id
                                ? 'border-cyan-500/40 bg-cyan-600/15'
                                : 'border-transparent bg-zinc-900 hover:bg-zinc-800/70'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${chat.isGroup ? 'bg-emerald-600' : 'bg-cyan-600'}`}>
                                {(chat.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-semibold">{chat.name || chat.id}</p>
                                    <span className="text-[10px] text-zinc-500">{formatChatTime(chat.conversationTimestamp)}</span>
                                </div>
                                <p className="truncate text-xs text-zinc-400">{chat.lastMessage || 'No messages yet'}</p>
                            </div>
                            {!!chat.unreadCount && <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-bold">{chat.unreadCount}</span>}
                        </div>
                    </button>
                ))}
            </div>
        </aside>
    );
}
