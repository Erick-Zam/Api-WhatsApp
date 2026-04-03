'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ChatBubbleLeftIcon,
    Bars3Icon,
    RectangleGroupIcon,
} from '@heroicons/react/24/solid';
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
    const [sessions, setSessions] = useState<WASession[]>([]);
    const [selectedSession, setSelectedSession] = useState('default');
    const [chatsSource, setChatsSource] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [showDesktopRail, setShowDesktopRail] = useState(true);
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [showConsentModal, setShowConsentModal] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chats = searchTerm
        ? chatsSource.filter((c) => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()))
        : chatsSource;

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
        setLoadingChats(true);
        setLoadingMessages(false);
    };

    const handleSelectChat = (chatId: string | null) => {
        setSelectedChat(chatId);
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
        if (!token) return;

        apiRequest<{ user?: { api_key?: string } }>('/auth/me', { token })
            .then((data) => {
                if (data.user?.api_key) setApiKey(data.user.api_key);
            })
            .catch((error) => {
                console.error('Failed to load /auth/me:', error);
            });

        apiRequest<WASession[]>('/sessions', { token })
            .then((data) => {
                if (!Array.isArray(data)) return;
                setSessions(data);
                const connected = data.find((s: WASession) => s.status === 'CONNECTED');
                if (connected) {
                    setLoadingChats(true);
                    setSelectedSession(connected.id);
                }
            })
            .catch((error) => {
                console.error('Failed to load /sessions:', error);
            });
    }, []);

    useEffect(() => {
        if (!selectedSession || !apiKey) return;
        apiRequest<{ success?: boolean; chats?: Partial<Chat>[] }>(`/chats?sessionId=${encodeURIComponent(selectedSession)}`, {
            headers: { 'x-api-key': apiKey },
            token: '',
        })
            .then((data) => {
                if (!data.success || !Array.isArray(data.chats)) {
                    setChatsSource([]);
                    return;
                }
                setChatsSource(data.chats.map(normalizeChat).filter((chat) => chat.id));
            })
            .catch((error) => {
                console.error('Failed to load chats:', error);
                setChatsSource([]);
            })
            .finally(() => setLoadingChats(false));
    }, [selectedSession, apiKey]);

    useEffect(() => {
        if (!selectedChat || !selectedSession || !apiKey) return;
        apiRequest<{ success?: boolean; messages?: Message[] }>(`/chats/${encodeURIComponent(selectedChat)}/messages?sessionId=${encodeURIComponent(selectedSession)}&limit=50`, {
            headers: { 'x-api-key': apiKey },
            token: '',
        })
            .then((data) => {
                if (data.success) {
                    setMessages(data.messages || []);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            })
            .catch((error) => {
                console.error('Failed to load messages:', error);
                setMessages([]);
            })
            .finally(() => setLoadingMessages(false));
    }, [selectedChat, selectedSession, apiKey]);

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
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
                    />
                )}

                <main className="flex min-h-0 flex-1 flex-col bg-transparent">
                    {!selectedChat && (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-slate-500">
                            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 text-center">
                                <RectangleGroupIcon className="mx-auto mb-2 h-10 w-10 text-cyan-300/70" />
                                <p className="text-base font-semibold text-slate-200">Choose a conversation</p>
                                <p className="mt-1 text-sm text-slate-400">Open a thread from the left panel to start messaging.</p>
                                {!showDesktopRail && (
                                    <button
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200"
                                        onClick={() => setShowDesktopRail(true)}
                                    >
                                        <Bars3Icon className="h-4 w-4" />
                                        Show conversations
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
                            Browse chats
                        </button>
                        <ChatBubbleLeftIcon className="mb-3 h-16 w-16 opacity-20" />
                        <p className="text-lg font-semibold text-slate-400">Select a chat to start messaging</p>
                    </div>
                )}

                {selectedChat && (
                    <ChatWindow
                        selectedChat={selectedChat}
                        currentChat={currentChat}
                        loadingMessages={loadingMessages}
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
