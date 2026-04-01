import type { Chat, WASession } from './types';
import ChatRailContent from './ChatRailContent';

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
        <aside className="hidden h-full min-h-0 w-full max-w-[22rem] shrink-0 flex-col border-r border-slate-800/70 bg-slate-950/65 p-3 lg:flex xl:max-w-[24rem]">
            <div className="mb-3 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Inbox</p>
                <h2 className="mt-1 text-lg font-bold text-slate-50">Conversations</h2>
            </div>

            <div className="min-h-0 flex-1">
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
                />
            </div>
        </aside>
    );
}
