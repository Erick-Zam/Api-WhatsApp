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
        setLoadingChats(true);
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
        setLoadingMessages(true);
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
        <div className="flex h-full w-full bg-black text-white overflow-hidden">
            {showConsentModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl border border-zinc-700/50 bg-zinc-900 p-6">
                        <h2 className="text-lg font-bold mb-2">Sync Contacts & Chats?</h2>
                        <p className="text-sm text-zinc-400 mb-4">This fetches contact data from your WhatsApp session to improve the chat UI.</p>
                        <div className="flex gap-2">
                            <button
                                className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold hover:bg-cyan-500"
                                onClick={() => {
                                    localStorage.setItem('chat_data_consent', 'true');
                                    setShowConsentModal(false);
                                }}
                            >
                                I Agree
                            </button>
                            <button
                                className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
                                onClick={() => setShowConsentModal(false)}
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <MobileChatDrawer
                open={showMobileDrawer}
                sessions={sessions}
                selectedSession={selectedSession}
                onSelectSession={setSelectedSession}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
                loadingChats={loadingChats}
                onClose={() => setShowMobileDrawer(false)}
            />

            <ChatList
                sessions={sessions}
                selectedSession={selectedSession}
                onSelectSession={setSelectedSession}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
                loadingChats={loadingChats}
            />

            <main className="flex-1 flex flex-col bg-black">
                {!selectedChat && (
                    <div className="flex h-full flex-col items-center justify-center text-zinc-600">
                        <button
                            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 lg:hidden"
                            onClick={() => setShowMobileDrawer(true)}
                        >
                            <Bars3Icon className="h-4 w-4" />
                            Browse chats
                        </button>
                        <ChatBubbleLeftIcon className="w-16 h-16 mb-3 opacity-20" />
                        <p className="text-lg font-semibold opacity-50">Select a chat</p>
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
