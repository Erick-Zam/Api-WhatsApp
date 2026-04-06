import type { Chat, WASession } from './types';
import { useTranslation } from 'react-i18next';
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
    loadingMoreChats?: boolean;
    hasMoreChats?: boolean;
    chatsError?: string | null;
    onRetryLoadChats?: () => void;
    onLoadMoreChats?: () => void;
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
    loadingMoreChats,
    hasMoreChats,
    chatsError,
    onRetryLoadChats,
    onLoadMoreChats,
}: ChatListProps) {
    const { t } = useTranslation();

    return (
        <aside className="hidden h-full min-h-0 w-full max-w-[22rem] shrink-0 flex-col border-r border-slate-800/70 bg-slate-950/65 p-3 lg:flex xl:max-w-[24rem]">
            <div className="mb-3 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">{t('chats.labels.inbox')}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-50">{t('chats.labels.conversations')}</h2>
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
                    loadingMoreChats={loadingMoreChats}
                    hasMoreChats={hasMoreChats}
                    chatsError={chatsError}
                    onRetryLoadChats={onRetryLoadChats}
                    onLoadMoreChats={onLoadMoreChats}
                />
            </div>
        </aside>
    );
}
