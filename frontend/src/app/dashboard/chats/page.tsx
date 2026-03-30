'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ChatBubbleLeftIcon,
    ChevronLeftIcon,
    InformationCircleIcon,
    MagnifyingGlassIcon,
    MicrophoneIcon,
    PaperClipIcon,
    PhoneIcon,
    PhotoIcon,
    VideoCameraIcon,
    XMarkIcon,
} from '@heroicons/react/24/solid';

interface Chat {
    id: string;
    name?: string;
    unreadCount?: number;
    conversationTimestamp?: number;
    lastMessage?: string;
    isGroup?: boolean;
}

interface Message {
    key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
    };
    message?: {
        conversation?: string;
        imageMessage?: { caption?: string };
        videoMessage?: { caption?: string };
        audioMessage?: { url?: string };
        documentMessage?: { fileName?: string; mimetype?: string };
        extendedTextMessage?: { text: string };
    };
    pushName?: string;
    messageTimestamp?: number;
}

interface WASession {
    id: string;
    status: string;
}

const formatChatTime = (ts?: number) => {
    if (!ts) return '';
    const ms = ts > 2_000_000_000 ? ts : ts * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

function renderMessageContent(msg: Message) {
    const m = msg.message;
    if (!m) return <span className="text-xs italic text-zinc-400">Empty message</span>;

    if (m.conversation) return <p className="whitespace-pre-wrap">{m.conversation}</p>;
    if (m.extendedTextMessage?.text) return <p className="whitespace-pre-wrap">{m.extendedTextMessage.text}</p>;

    if (m.imageMessage) {
        return (
            <div className="space-y-2">
                <div className="h-28 rounded-xl border border-zinc-700/40 bg-zinc-800/60 flex items-center justify-center">
                    <PhotoIcon className="w-8 h-8 text-zinc-500" />
                </div>
                {m.imageMessage.caption && <p className="text-xs text-zinc-200">{m.imageMessage.caption}</p>}
            </div>
        );
    }

    if (m.videoMessage) {
        return (
            <div className="space-y-2">
                <div className="h-28 rounded-xl border border-zinc-700/40 bg-zinc-800/60 flex items-center justify-center">
                    <VideoCameraIcon className="w-8 h-8 text-zinc-500" />
                </div>
                {m.videoMessage.caption && <p className="text-xs text-zinc-200">{m.videoMessage.caption}</p>}
            </div>
        );
    }

    if (m.audioMessage) {
        return (
            <div className="flex items-center gap-2 text-xs">
                <MicrophoneIcon className="w-4 h-4 text-cyan-400" />
                <span>Audio message</span>
            </div>
        );
    }

    if (m.documentMessage) {
        return (
            <div className="flex items-center gap-2 text-xs">
                <PaperClipIcon className="w-4 h-4 text-emerald-400" />
                <span className="truncate">{m.documentMessage.fileName || 'document'}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs italic text-zinc-400">
            <InformationCircleIcon className="w-4 h-4" />
            <span>Unsupported message type</span>
        </div>
    );
}

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

            {showMobileDrawer && (
                <div className="absolute inset-0 z-40 lg:hidden">
                    <button className="absolute inset-0 bg-black/60" onClick={() => setShowMobileDrawer(false)} aria-label="Close drawer" />
                    <div className="relative h-full w-72 border-r border-zinc-800 bg-zinc-950 p-3">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold">Sessions</h3>
                            <button onClick={() => setShowMobileDrawer(false)}>
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {sessions.map((s) => (
                                <button
                                    key={s.id}
                                    className={`w-full rounded-lg p-2 text-left ${selectedSession === s.id ? 'bg-cyan-600/20 text-cyan-300' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                                    onClick={() => {
                                        setSelectedSession(s.id);
                                        setShowMobileDrawer(false);
                                    }}
                                >
                                    <div className="text-sm font-semibold">{s.id}</div>
                                    <div className="text-xs text-zinc-400">{s.status}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <aside className="hidden lg:flex w-80 flex-col border-r border-zinc-800/60 bg-zinc-950">
                <div className="p-4 border-b border-zinc-800/60">
                    <h2 className="text-lg font-bold text-cyan-400">Chats</h2>
                </div>
                <div className="p-3 border-b border-zinc-800/40">
                    <select
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                        {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.id} ({s.status})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="p-3 border-b border-zinc-800/40">
                    <div className="flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3">
                        <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ml-2 w-full bg-transparent text-sm outline-none"
                            placeholder="Search"
                        />
                    </div>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                    {loadingChats && <div className="p-3 text-sm text-zinc-400">Loading chats...</div>}
                    {!loadingChats && chats.length === 0 && <div className="p-3 text-sm text-zinc-500">No chats found</div>}
                    {chats.map((chat) => (
                        <button
                            key={chat.id}
                            onClick={() => setSelectedChat(chat.id)}
                            className={`w-full rounded-lg border p-3 text-left transition ${
                                selectedChat === chat.id
                                    ? 'border-cyan-500/40 bg-cyan-600/15'
                                    : 'border-transparent bg-zinc-900 hover:bg-zinc-800/70'
                            }`}
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
            </aside>

            <main className="flex-1 flex flex-col bg-black">
                {!selectedChat && (
                    <div className="flex h-full flex-col items-center justify-center text-zinc-600">
                        <ChatBubbleLeftIcon className="w-16 h-16 mb-3 opacity-20" />
                        <p className="text-lg font-semibold opacity-50">Select a chat</p>
                    </div>
                )}

                {selectedChat && (
                    <>
                        <div className="h-16 border-b border-zinc-800/60 bg-zinc-950/60 px-4 lg:px-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button className="lg:hidden rounded-lg p-1.5 hover:bg-zinc-800" onClick={() => setShowMobileDrawer(true)}>
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                                <div>
                                    <p className="text-sm font-semibold">{currentChat?.name || selectedChat}</p>
                                    <p className="text-xs text-emerald-400/80">Active now</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="rounded-lg p-2 hover:bg-zinc-800"><PhoneIcon className="w-5 h-5 text-zinc-300" /></button>
                                <button className="rounded-lg p-2 hover:bg-zinc-800 hidden md:block"><VideoCameraIcon className="w-5 h-5 text-zinc-300" /></button>
                                <button className="rounded-lg p-2 hover:bg-zinc-800"><InformationCircleIcon className="w-5 h-5 text-zinc-300" /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3">
                            {loadingMessages && <div className="text-sm text-zinc-400">Loading messages...</div>}
                            {!loadingMessages && messages.length === 0 && <div className="text-sm text-zinc-500">No messages yet.</div>}
                            {messages.map((msg) => {
                                const mine = msg.key.fromMe;
                                return (
                                    <div key={msg.key.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[80%] lg:max-w-[62%] rounded-2xl px-4 py-2 text-sm ${
                                                mine
                                                    ? 'bg-cyan-600/85 text-white rounded-br-none'
                                                    : 'bg-zinc-800/70 border border-zinc-700/40 text-zinc-100 rounded-bl-none'
                                            }`}
                                        >
                                            {renderMessageContent(msg)}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="border-t border-zinc-800/60 bg-zinc-950/60 p-4">
                            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                                <button type="button" className="rounded-lg p-2 hover:bg-zinc-800 text-zinc-400">
                                    <PaperClipIcon className="w-5 h-5" />
                                </button>
                                <div className="flex-1">
                                    <input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                                        placeholder="Type a message"
                                    />
                                </div>
                                {newMessage.trim() ? (
                                    <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold hover:bg-cyan-500">
                                        Send
                                    </button>
                                ) : (
                                    <button type="button" className="rounded-lg p-2 hover:bg-zinc-800 text-zinc-400">
                                        <MicrophoneIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </form>
                        </div>
                    </>
                )}
            </main>

            {selectedChat && (
                <aside className="hidden xl:flex w-80 flex-col border-l border-zinc-800/60 bg-zinc-950">
                    <div className="h-16 border-b border-zinc-800/60 px-6 flex items-center">
                        <h3 className="font-semibold">Details</h3>
                    </div>
                    <div className="p-6 space-y-5 overflow-y-auto">
                        <div className="text-center">
                            <div className={`mx-auto mb-2 h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold ${currentChat?.isGroup ? 'bg-emerald-600' : 'bg-cyan-600'}`}>
                                {(currentChat?.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <p className="font-semibold">{currentChat?.name || selectedChat}</p>
                            <p className="text-xs text-zinc-500">{currentChat?.isGroup ? 'Group chat' : 'Direct chat'}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                            <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Session</p>
                            <p className="text-sm text-zinc-200">{selectedSession}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                            <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Last activity</p>
                            <p className="text-sm text-zinc-200">{formatChatTime(currentChat?.conversationTimestamp) || 'Unknown'}</p>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
