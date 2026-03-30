import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/solid';
import type { Chat, WASession } from './types';
import { formatChatTime } from './types';

interface MobileChatDrawerProps {
    open: boolean;
    sessions: WASession[];
    selectedSession: string;
    onSelectSession: (sessionId: string) => void;
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    chats: Chat[];
    selectedChat: string | null;
    onSelectChat: (chatId: string) => void;
    loadingChats: boolean;
    onClose: () => void;
}

export default function MobileChatDrawer({
    open,
    sessions,
    selectedSession,
    onSelectSession,
    searchTerm,
    onSearchTermChange,
    chats,
    selectedChat,
    onSelectChat,
    loadingChats,
    onClose,
}: MobileChatDrawerProps) {
    if (!open) return null;

    return (
        <div className="absolute inset-0 z-40 lg:hidden">
            <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close drawer" />
            <div className="relative h-full w-80 border-r border-zinc-800 bg-zinc-950 p-3 overflow-y-auto">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Chats</h3>
                    <button onClick={onClose}>
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-3">
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

                <div className="mb-3 flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3">
                    <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
                    <input
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        className="ml-2 w-full bg-transparent text-sm outline-none"
                        placeholder="Search"
                    />
                </div>

                <div className="space-y-2">
                    {loadingChats && <div className="p-3 text-sm text-zinc-400">Loading chats...</div>}
                    {!loadingChats && chats.length === 0 && <div className="p-3 text-sm text-zinc-500">No chats found</div>}
                    {chats.map((chat) => (
                        <button
                            key={chat.id}
                            className={`w-full rounded-lg border p-3 text-left transition ${
                                selectedChat === chat.id
                                    ? 'border-cyan-500/40 bg-cyan-600/15'
                                    : 'border-transparent bg-zinc-900 hover:bg-zinc-800/70'
                            }`}
                            onClick={() => {
                                onSelectChat(chat.id);
                                onClose();
                            }}
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
            </div>
        </div>
    );
}
