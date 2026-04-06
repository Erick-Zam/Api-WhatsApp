'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ChatBubbleLeftIcon,
    Bars3Icon,
    RectangleGroupIcon,
} from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import ChatDetailsPanel from '../../../components/chats/ChatDetailsPanel';
import ChatList from '../../../components/chats/ChatList';
import ChatWindow from '../../../components/chats/ChatWindow';
import MobileChatDrawer from '../../../components/chats/MobileChatDrawer';
import { type Chat, type Message, type WASession } from '../../../components/chats/types';
import Button from '@/components/ui/Button';
import { ApiError, apiRequest } from '@/lib/api/client';

const toDisplayName = (chat: Partial<Chat>) => {
    const fallbackId = typeof chat.id === 'string' ? chat.id : '';
    const phoneFallback = fallbackId.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const candidates = [chat.name, phoneFallback, fallbackId].filter((value) => typeof value === 'string' && value.trim().length > 0);
    return candidates[0] || 'Unknown contact';
};

const normalizeChat = (chat: Partial<Chat>): Chat => ({
    id: String(chat.id || ''),
    name: toDisplayName(chat),
    unreadCount: typeof chat.unreadCount === 'number' ? chat.unreadCount : 0,
    conversationTimestamp: typeof chat.conversationTimestamp === 'number' ? chat.conversationTimestamp : 0,
    lastMessage: typeof chat.lastMessage === 'string' ? chat.lastMessage : '',
    isGroup: Boolean(chat.isGroup),
});

export default function ChatsPage() {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<WASession[]>([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [chatsSource, setChatsSource] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [showDesktopRail, setShowDesktopRail] = useState(true);
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [chatsError, setChatsError] = useState<string | null>(null);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [hasMoreChats, setHasMoreChats] = useState(false);
    const [chatCursor, setChatCursor] = useState<string | null>(null);
    const [loadingMoreChats, setLoadingMoreChats] = useState(false);
    const [messageCursor, setMessageCursor] = useState<string | null>(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [reloadChatsTick, setReloadChatsTick] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }, []);

    const chats = useMemo(
        () =>
            searchTerm
                ? chatsSource.filter((c) => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()))
                : chatsSource,
        [searchTerm, chatsSource],
    );

    const currentChat = chats.find((c) => c.id === selectedChat);
    const desktopColumns = showDesktopRail
        ? showDetailsPanel
            ? 'minmax(20rem, 24rem) minmax(0, 1fr) minmax(18rem, 20rem)'
            : 'minmax(20rem, 24rem) minmax(0, 1fr)'
        : showDetailsPanel
            ? 'minmax(0, 1fr) minmax(18rem, 20rem)'
            : 'minmax(0, 1fr)';

    const handleSelectSession = (sessionId: string) => {
        setSelectedSession(sessionId);
        setSelectedChat(null);
        setMessages([]);
        setMessagesError(null);
        setChatsError(null);
        setHasMoreChats(false);
        setChatCursor(null);
        setLoadingMoreChats(false);
        setMessageCursor(null);
        setHasMoreMessages(false);
        setLoadingChats(true);
        setLoadingMessages(false);
    };

    const handleSelectChat = (chatId: string | null) => {
        setSelectedChat(chatId);
        setMessagesError(null);
        setMessageCursor(null);
        setHasMoreMessages(false);
        if (chatId) {
            setLoadingMessages(true);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowConsentModal(!localStorage.getItem('chat_data_consent'));
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setChatsError(t('chats.errors.authRequired'));
            setLoadingChats(false);
            return;
        }

        const abortController = new AbortController();
        let active = true;

        setLoadingChats(true);
        setChatsError(null);

        Promise.allSettled([
            apiRequest<{ user?: { api_key?: string } }>('/auth/me', { token, signal: abortController.signal }),
            apiRequest<WASession[]>('/sessions', { token, signal: abortController.signal }),
        ]).then(([authResult, sessionsResult]) => {
            if (!active) return;

            if (authResult.status === 'fulfilled' && authResult.value.user?.api_key) {
                setApiKey(authResult.value.user.api_key);
            } else {
                setChatsError(t('chats.errors.apiKeyMissing'));
            }

            if (sessionsResult.status === 'fulfilled' && Array.isArray(sessionsResult.value)) {
                const loadedSessions = sessionsResult.value;
                setSessions(loadedSessions);
                const connected = loadedSessions.find((s: WASession) => s.status === 'CONNECTED');
                const preferred = connected || loadedSessions[0];
                if (preferred) {
                    setSelectedSession(preferred.id);
                } else {
                    setSelectedSession('');
                    setChatsSource([]);
                    setLoadingChats(false);
                }
            } else {
                setSessions([]);
                setSelectedSession('');
                setChatsSource([]);
                setLoadingChats(false);
                if (!abortController.signal.aborted) {
                    setChatsError(t('chats.errors.sessionsLoadFailed'));
                }
            }
        });

        return () => {
            active = false;
            abortController.abort();
        };
    }, [t]);

    useEffect(() => {
        if (!selectedSession) {
            setChatsSource([]);
            setHasMoreChats(false);
            setChatCursor(null);
            setLoadingChats(false);
            return;
        }
        if (!apiKey) {
            setLoadingChats(false);
            return;
        }

        const abortController = new AbortController();
        setLoadingChats(true);
        setChatsError(null);

        apiRequest<{ success?: boolean; chats?: Partial<Chat>[] }>(`/chats?sessionId=${encodeURIComponent(selectedSession)}&limit=120`, {
            headers: { 'x-api-key': apiKey },
            token: '',
            signal: abortController.signal,
        })
            .then((data) => {
                if (!data.success || !Array.isArray(data.chats)) {
                    setChatsSource([]);
                    return;
                }
                const normalized = data.chats.map(normalizeChat).filter((chat) => chat.id);
                setChatsSource(normalized);
                setHasMoreChats(Boolean((data as { hasMore?: boolean }).hasMore));
                setChatCursor((data as { nextCursor?: string | null }).nextCursor || null);
                setSelectedChat((current) => (current && normalized.some((chat) => chat.id === current) ? current : null));
            })
            .catch((error) => {
                if (abortController.signal.aborted) return;
                setChatsSource([]);
                setHasMoreChats(false);
                setChatCursor(null);
                setChatsError(error instanceof ApiError ? error.message : t('chats.errors.chatsLoadFailed'));
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoadingChats(false);
                }
            });

        return () => abortController.abort();
    }, [selectedSession, apiKey, reloadChatsTick, t]);

    useEffect(() => {
        if (!selectedChat || !selectedSession || !apiKey) {
            setLoadingMessages(false);
            return;
        }

        const abortController = new AbortController();
        setLoadingMessages(true);
        setMessagesError(null);

        apiRequest<{ success?: boolean; messages?: Message[] }>(`/chats/${encodeURIComponent(selectedChat)}/messages?sessionId=${encodeURIComponent(selectedSession)}&limit=50`, {
            headers: { 'x-api-key': apiKey },
            token: '',
            signal: abortController.signal,
        })
            .then((data) => {
                if (data.success) {
                    setMessages(data.messages || []);
                    setHasMoreMessages(Boolean((data as { hasMore?: boolean }).hasMore));
                    setMessageCursor((data as { nextCursor?: string | null }).nextCursor || null);
                    scrollToBottom();
                }
            })
            .catch((error) => {
                if (abortController.signal.aborted) return;
                setMessages([]);
                setMessagesError(error instanceof ApiError ? error.message : t('chats.errors.messagesLoadFailed'));
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoadingMessages(false);
                }
            });

        return () => abortController.abort();
    }, [selectedChat, selectedSession, apiKey, scrollToBottom, t]);

    const handleLoadOlderMessages = useCallback(async () => {
        if (!selectedChat || !selectedSession || !apiKey || !messageCursor || loadingOlderMessages) return;
        setLoadingOlderMessages(true);
        setMessagesError(null);

        try {
            const data = await apiRequest<{ success?: boolean; messages?: Message[]; hasMore?: boolean; nextCursor?: string | null }>(
                `/chats/${encodeURIComponent(selectedChat)}/messages?sessionId=${encodeURIComponent(selectedSession)}&limit=50&before=${encodeURIComponent(messageCursor)}`,
                {
                    headers: { 'x-api-key': apiKey },
                    token: '',
                },
            );

            if (!data.success) {
                return;
            }

            const older = data.messages || [];
            if (older.length > 0) {
                setMessages((prev) => [...older, ...prev]);
            }
            setHasMoreMessages(Boolean(data.hasMore));
            setMessageCursor(data.nextCursor || null);
        } catch (error) {
            setMessagesError(error instanceof ApiError ? error.message : t('chats.errors.messagesLoadFailed'));
        } finally {
            setLoadingOlderMessages(false);
        }
    }, [selectedChat, selectedSession, apiKey, messageCursor, loadingOlderMessages, t]);

    const handleRetryChats = useCallback(() => {
        setReloadChatsTick((tick) => tick + 1);
    }, []);

    const handleLoadMoreChats = useCallback(async () => {
        if (!selectedSession || !apiKey || !chatCursor || loadingMoreChats || !hasMoreChats) return;
        setLoadingMoreChats(true);
        setChatsError(null);

        try {
            const data = await apiRequest<{ success?: boolean; chats?: Partial<Chat>[]; hasMore?: boolean; nextCursor?: string | null }>(
                `/chats?sessionId=${encodeURIComponent(selectedSession)}&limit=120&before=${encodeURIComponent(chatCursor)}`,
                {
                    headers: { 'x-api-key': apiKey },
                    token: '',
                },
            );

            if (!data.success || !Array.isArray(data.chats)) return;

            const incoming = data.chats.map(normalizeChat).filter((chat) => chat.id);
            if (incoming.length > 0) {
                setChatsSource((prev) => {
                    const seen = new Set(prev.map((chat) => chat.id));
                    const uniqueIncoming = incoming.filter((chat) => !seen.has(chat.id));
                    return [...prev, ...uniqueIncoming];
                });
            }

            setHasMoreChats(Boolean(data.hasMore));
            setChatCursor(data.nextCursor || null);
        } catch (error) {
            setChatsError(error instanceof ApiError ? error.message : t('chats.errors.chatsLoadFailed'));
        } finally {
            setLoadingMoreChats(false);
        }
    }, [selectedSession, apiKey, chatCursor, loadingMoreChats, hasMoreChats, t]);

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !apiKey) return;

        try {
            const data = await apiRequest<{ success?: boolean; error?: string }>('/messages/text', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                },
                token: '',
                body: {
                    sessionId: selectedSession,
                    phone: selectedChat.replace('@s.whatsapp.net', ''),
                    message: newMessage,
                },
            });
            if (!data.success) return;

            const sent = newMessage;
            setNewMessage('');
            setMessages((prev) => [
                ...prev,
                {
                    key: { remoteJid: selectedChat, fromMe: true, id: `temp-${Date.now()}` },
                    message: { conversation: sent },
                    messageTimestamp: Math.floor(Date.now() / 1000),
                },
            ]);
            scrollToBottom();
        } catch (err) {
            if (err instanceof ApiError) {
                console.error(`Failed to send message (${err.status}): ${err.message}`);
                return;
            }
            console.error(err);
        }
    };

    return (
        <div className="relative -m-5 h-[100dvh] overflow-hidden border border-slate-800/70 bg-slate-950/50 text-white md:-m-8 lg:-m-10">
            {showConsentModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl surface-card--elevated p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">Privacy</p>
                        <h2 className="mb-2 mt-1 text-lg font-bold">Sync contacts and chats?</h2>
                        <p className="mb-4 text-sm text-slate-300">This loads WhatsApp contact metadata to improve chat navigation and thread previews.</p>
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    localStorage.setItem('chat_data_consent', 'true');
                                    setShowConsentModal(false);
                                }}
                            >
                                I Agree
                            </Button>
                            <Button variant="secondary" className="flex-1" onClick={() => setShowConsentModal(false)}>
                                Later
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <MobileChatDrawer
                open={showMobileDrawer}
                sessions={sessions}
                selectedSession={selectedSession}
                onSelectSession={handleSelectSession}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                loadingChats={loadingChats}
                loadingMoreChats={loadingMoreChats}
                hasMoreChats={hasMoreChats}
                chatsError={chatsError}
                onRetryLoadChats={handleRetryChats}
                onLoadMoreChats={handleLoadMoreChats}
                onClose={() => setShowMobileDrawer(false)}
            />

            <div className="hidden h-full lg:grid" style={{ gridTemplateColumns: desktopColumns }}>
                {showDesktopRail && (
                    <ChatList
                        sessions={sessions}
                        selectedSession={selectedSession}
                        onSelectSession={handleSelectSession}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        chats={chats}
                        selectedChat={selectedChat}
                        onSelectChat={handleSelectChat}
                        loadingChats={loadingChats}
                        loadingMoreChats={loadingMoreChats}
                        hasMoreChats={hasMoreChats}
                        chatsError={chatsError}
                        onRetryLoadChats={handleRetryChats}
                        onLoadMoreChats={handleLoadMoreChats}
                    />
                )}

                <main className="flex min-h-0 flex-1 flex-col bg-transparent">
                    {!selectedChat && (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-slate-500">
                            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 text-center">
                                <RectangleGroupIcon className="mx-auto mb-2 h-10 w-10 text-cyan-300/70" />
                                <p className="text-base font-semibold text-slate-200">{t('chats.emptyState.title')}</p>
                                <p className="mt-1 text-sm text-slate-400">{t('chats.emptyState.subtitle')}</p>
                                {!showDesktopRail && (
                                    <button
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200"
                                        onClick={() => setShowDesktopRail(true)}
                                    >
                                        <Bars3Icon className="h-4 w-4" />
                                        {t('chats.actions.showConversations')}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedChat && (
                        <ChatWindow
                            selectedChat={selectedChat}
                            currentChat={currentChat}
                            loadingMessages={loadingMessages}
                            loadingOlderMessages={loadingOlderMessages}
                            hasMoreMessages={hasMoreMessages}
                            messagesError={messagesError}
                            onLoadOlderMessages={handleLoadOlderMessages}
                            messages={messages}
                            messagesEndRef={messagesEndRef}
                            onOpenDrawer={() => setShowMobileDrawer(true)}
                            onToggleDesktopRail={() => setShowDesktopRail((prev) => !prev)}
                            onToggleDetailsPanel={() => setShowDetailsPanel((prev) => !prev)}
                            showDesktopRail={showDesktopRail}
                            showDetailsPanel={showDetailsPanel}
                            newMessage={newMessage}
                            onNewMessageChange={setNewMessage}
                            onSendMessage={handleSendMessage}
                        />
                    )}
                </main>

                {selectedChat && showDetailsPanel && (
                    <ChatDetailsPanel selectedChat={selectedChat} selectedSession={selectedSession} currentChat={currentChat} />
                )}
            </div>

            <div className="flex h-full flex-col lg:hidden">
                {!selectedChat && (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-slate-500">
                        <button
                            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200"
                            onClick={() => setShowMobileDrawer(true)}
                        >
                            <Bars3Icon className="h-4 w-4" />
                            {t('chats.actions.browseChats')}
                        </button>
                        <ChatBubbleLeftIcon className="mb-3 h-16 w-16 opacity-20" />
                        <p className="text-lg font-semibold text-slate-400">{t('chats.emptyState.mobileTitle')}</p>
                    </div>
                )}

                {selectedChat && (
                    <ChatWindow
                        selectedChat={selectedChat}
                        currentChat={currentChat}
                        loadingMessages={loadingMessages}
                        loadingOlderMessages={loadingOlderMessages}
                        hasMoreMessages={hasMoreMessages}
                        messagesError={messagesError}
                        onLoadOlderMessages={handleLoadOlderMessages}
                        messages={messages}
                        messagesEndRef={messagesEndRef}
                        onOpenDrawer={() => setShowMobileDrawer(true)}
                        onToggleDesktopRail={() => setShowDesktopRail((prev) => !prev)}
                        onToggleDetailsPanel={() => setShowDetailsPanel((prev) => !prev)}
                        showDesktopRail={showDesktopRail}
                        showDetailsPanel={showDetailsPanel}
                        newMessage={newMessage}
                        onNewMessageChange={setNewMessage}
                        onSendMessage={handleSendMessage}
                    />
                )}
            </div>
        </div>
    );
}
