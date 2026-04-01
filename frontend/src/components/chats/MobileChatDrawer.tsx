import { XMarkIcon } from '@heroicons/react/24/solid';
import type { Chat, WASession } from './types';
import ChatRailContent from './ChatRailContent';

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
            <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close drawer" />
            <div className="relative h-full w-[min(90vw,24rem)] border-r border-slate-800/80 bg-slate-950/95 p-3">
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-900/75 p-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Inbox</p>
                        <h3 className="text-base font-semibold text-slate-100">Conversations</h3>
                    </div>
                    <button onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex h-[calc(100%-4.5rem)] flex-col gap-3">
                    <ChatRailContent
                        sessions={sessions}
                        selectedSession={selectedSession}
                        onSelectSession={onSelectSession}
                        searchTerm={searchTerm}
                        onSearchTermChange={onSearchTermChange}
                        chats={chats}
                        selectedChat={selectedChat}
                        onSelectChat={onSelectChat}
                        loadingChats={loadingChats}
                        onAfterSelectChat={onClose}
                    />
                </div>
            </div>
        </div>
    );
}
