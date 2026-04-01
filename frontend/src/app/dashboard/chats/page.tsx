'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ChatBubbleLeftIcon,
    Bars3Icon,
} from '@heroicons/react/24/solid';
import ChatDetailsPanel from '../../../components/chats/ChatDetailsPanel';
import ChatList from '../../../components/chats/ChatList';
import ChatWindow from '../../../components/chats/ChatWindow';
import MobileChatDrawer from '../../../components/chats/MobileChatDrawer';
import { type Chat, type Message, type WASession } from '../../../components/chats/types';
import Button from '@/components/ui/Button';

export default function ChatsPage() {
    const [sessions, setSessions] = useState<WASession[]>([]);
    const [selectedSession, setSelectedSession] = useState('default');
    const [chatsSource, setChatsSource] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(() => {
        if (typeof window === 'undefined') return false;
        return !localStorage.getItem('chat_data_consent');
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chats = searchTerm
        ? chatsSource.filter((c) => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()))
        : chatsSource;

    const currentChat = chats.find((c) => c.id === selectedChat);

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
        const token = localStorage.getItem('token');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        if (!token) return;

        fetch(`${apiBase}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.user?.api_key) setApiKey(data.user.api_key);
            })
            .catch(console.error);

        fetch(`${apiBase}/sessions`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (!Array.isArray(data)) return;
                setSessions(data);
                const connected = data.find((s: WASession) => s.status === 'CONNECTED');
                if (connected) setSelectedSession(connected.id);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!selectedSession || !apiKey) return;
        fetch(`/api/chats?sessionId=${encodeURIComponent(selectedSession)}`, {
            headers: { 'x-api-key': apiKey },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.success) setChatsSource(data.chats || []);
            })
            .catch(console.error)
            .finally(() => setLoadingChats(false));
    }, [selectedSession, apiKey]);

    useEffect(() => {
        if (!selectedChat || !selectedSession || !apiKey) return;
        fetch(`/api/chats/${encodeURIComponent(selectedChat)}/messages?sessionId=${encodeURIComponent(selectedSession)}&limit=50`, {
            headers: { 'x-api-key': apiKey },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.success) {
                    setMessages(data.messages || []);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            })
            .catch(console.error)
            .finally(() => setLoadingMessages(false));
    }, [selectedChat, selectedSession, apiKey]);

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !apiKey) return;

        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        try {
            const res = await fetch(`${apiBase}/messages/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    sessionId: selectedSession,
                    phone: selectedChat.replace('@s.whatsapp.net', ''),
                    message: newMessage,
                }),
            });
            const data = await res.json();
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
            console.error(err);
        }
    };

    return (
        <div className="relative flex h-full w-full overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/50 text-white">
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

            <main className="flex-1 flex-col bg-transparent">
                {!selectedChat && (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-slate-500">
                        <button
                            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 lg:hidden"
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
                        newMessage={newMessage}
                        onNewMessageChange={setNewMessage}
                        onSendMessage={handleSendMessage}
                    />
                )}
            </main>

            {selectedChat && (
                <ChatDetailsPanel selectedChat={selectedChat} selectedSession={selectedSession} currentChat={currentChat} />
            )}
        </div>
    );
}
