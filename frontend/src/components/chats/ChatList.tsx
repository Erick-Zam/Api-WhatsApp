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
        <aside className="hidden w-[22rem] shrink-0 flex-col border-r border-slate-800/70 bg-slate-950/70 p-4 lg:flex">
            <div className="mb-4 rounded-2xl surface-card--elevated p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Conversations</p>
                <h2 className="mt-1 text-lg font-bold text-slate-50">Chats</h2>
            </div>

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
        </aside>
    );
}
