import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect, useCallback } from 'react';
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
    loadingMoreChats?: boolean;
    hasMoreChats?: boolean;
    chatsError?: string | null;
    onRetryLoadChats?: () => void;
    onLoadMoreChats?: () => void;
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
    loadingMoreChats,
    hasMoreChats,
    chatsError,
    onRetryLoadChats,
    onLoadMoreChats,
    onAfterSelectChat,
}: ChatRailContentProps) {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle infinite scroll - load more when user scrolls near bottom
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Clear any pending debounce
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Debounce scroll handler to avoid excessive calls
            scrollTimeoutRef.current = setTimeout(() => {
                const { scrollHeight, scrollTop, clientHeight } = container;
                const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

                // Trigger load when user is 80% down and conditions are met
                if (scrollPercentage > 0.8 && hasMoreChats && !loadingMoreChats && onLoadMoreChats) {
                    onLoadMoreChats();
                }
            }, 150);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [hasMoreChats, loadingMoreChats, onLoadMoreChats]);

    return (
        <div className="flex h-full min-h-0 flex-col gap-2.5">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('chats.labels.session')}</p>
                <select
                    value={selectedSession}
                    onChange={(e) => onSelectSession(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                >
                    {sessions.length === 0 && (
                        <option value="">{t('chats.labels.noSessions')}</option>
                    )}
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
                        placeholder={t('chats.labels.searchPlaceholder')}
                    />
                </label>
                {onRetryLoadChats && (
                    <div className="mt-2 flex justify-end">
                        <button
                            type="button"
                            onClick={onRetryLoadChats}
                            className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
                        >
                            {t('chats.actions.refreshChats')}
                        </button>
                    </div>
                )}
            </div>

            <div className="app-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" ref={scrollContainerRef}>
                {loadingChats && (
                    <>
                        <div className="h-16 animate-pulse rounded-2xl border border-slate-700/50 bg-slate-900/60" />
                        <div className="h-16 animate-pulse rounded-2xl border border-slate-700/50 bg-slate-900/60" />
                        <div className="h-16 animate-pulse rounded-2xl border border-slate-700/50 bg-slate-900/60" />
                    </>
                )}
                {!loadingChats && chatsError && (
                    <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-100">
                        <p className="font-semibold">{t('chats.errors.title')}</p>
                        <p className="mt-1 text-xs text-rose-100/80">{chatsError}</p>
                        {onRetryLoadChats && (
                            <button
                                type="button"
                                className="mt-2 rounded-lg border border-rose-300/40 bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-50"
                                onClick={onRetryLoadChats}
                            >
                                {t('chats.actions.retry')}
                            </button>
                        )}
                    </div>
                )}
                {!loadingChats && !chatsError && chats.length === 0 && (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-3 text-sm text-slate-500">{t('chats.labels.noChatsFound')}</div>
                )}

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
                                    <p className="mt-0.5 truncate text-xs text-slate-400">{chat.lastMessage || t('chats.labels.noMessagesYet')}</p>
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

                {!loadingChats && !chatsError && hasMoreChats && onLoadMoreChats && (
                    <div className="flex justify-center pt-2">
                        {loadingMoreChats ? (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" style={{ animationDelay: '0.1s' }} />
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" style={{ animationDelay: '0.2s' }} />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onLoadMoreChats}
                                className="rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[10px] font-semibold text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
                            >
                                {t('chats.actions.loadMoreChats')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
