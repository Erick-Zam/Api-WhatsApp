'use client';

import { useState, useEffect, useRef } from 'react';
import {
    ChatBubbleLeftIcon,
    VideoCameraIcon,
    PhoneIcon,
    InformationCircleIcon,
    FaceSmileIcon,
    PaperClipIcon,
    PhotoIcon,
    MicrophoneIcon,
    MagnifyingGlassIcon,
    EllipsisHorizontalIcon,
    CheckCircleIcon
} from '@heroicons/react/24/solid';

// Types
interface Chat {
    id: string;
    name?: string;
    unreadCount?: number;
    conversationTimestamp?: number;
    imgUrl?: string; // Placeholder for future avatar support
}

interface Message {
    key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
    };
    message?: {
        conversation?: string;
        imageMessage?: any;
        videoMessage?: any;
        audioMessage?: any;
        documentMessage?: any;
        extendedTextMessage?: {
            text: string;
        };
        pollCreationMessage?: {
            name: string;
            options: { optionName: string }[];
            selectableCount: number;
        };
        pollCreationMessageV2?: {
            name: string;
            options: { optionName: string }[];
            selectableCount: number;
        };
    };
    pushName?: string;
    messageTimestamp?: number;
}

export default function ChatsPage() {
    // State
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState('default');
    const [chats, setChats] = useState<Chat[]>([]);
    const [originalChats, setOriginalChats] = useState<Chat[]>([]); // For filtering
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Consent Modal State
    const [showConsentModal, setShowConsentModal] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Initial Load & Auth
    useEffect(() => {
        // Check consent first (mock check)
        const hasConsented = localStorage.getItem('chat_data_consent');
        if (!hasConsented) {
            setShowConsentModal(true);
        }

        const token = localStorage.getItem('token');
        if (token) {
            // Get API Key
            fetch(`${process.env.NEXT_PUBLIC_API_URL || `/api`}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.api_key) setApiKey(data.user.api_key);
                })
                .catch(err => console.error(err));

            // Get Sessions
            fetch(`${process.env.NEXT_PUBLIC_API_URL || `/api`}/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSessions(data);
                        const connected = data.find((s: any) => s.status === 'CONNECTED');
                        if (connected) setSelectedSession(connected.id);
                    }
                })
                .catch(err => console.error(err));
        }
    }, []);

    // 2. Load Chats
    useEffect(() => {
        if (!selectedSession || !apiKey) return;

        setLoadingChats(true);
        fetch(`/api/chats?sessionId=${selectedSession}`, {
            headers: { 'x-api-key': apiKey }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const sorted = data.chats.sort((a: Chat, b: Chat) =>
                        (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0)
                    );
                    setOriginalChats(sorted);
                    setChats(sorted);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingChats(false));
    }, [selectedSession, apiKey]);

    // Search Filter
    useEffect(() => {
        if (!searchTerm) {
            setChats(originalChats);
        } else {
            const lower = searchTerm.toLowerCase();
            setChats(originalChats.filter(c =>
                (c.name || '').toLowerCase().includes(lower) ||
                c.id.includes(lower)
            ));
        }
    }, [searchTerm, originalChats]);

    // 3. Load Messages
    useEffect(() => {
        if (!selectedSession || !selectedChat || !apiKey) return;

        setLoadingMessages(true);
        const encodedJid = encodeURIComponent(selectedChat);
        fetch(`/api/chats/${encodedJid}/messages?sessionId=${selectedSession}&limit=50`, {
            headers: { 'x-api-key': apiKey }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Determine poll structure handling if needed
                    setMessages(data.messages);
                    scrollToBottom();
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingMessages(false));
    }, [selectedChat, selectedSession, apiKey]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !apiKey) return;

        setSending(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `/api`}/messages/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    sessionId: selectedSession,
                    phone: selectedChat.replace('@s.whatsapp.net', ''),
                    message: newMessage
                })
            });
            const data = await res.json();
            if (data.success) {
                setNewMessage('');
                setMessages(prev => [...prev, {
                    key: { remoteJid: selectedChat, fromMe: true, id: 'temp-' + Date.now() },
                    message: { conversation: newMessage },
                    messageTimestamp: Date.now() / 1000
                }]);
                scrollToBottom();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const acceptConsent = () => {
        localStorage.setItem('chat_data_consent', 'true');
        setShowConsentModal(false);
    };

    const renderMessageContent = (msg: Message) => {
        const m = msg.message;
        if (!m) return <span className="text-gray-500 italic">Message removed or empty</span>;

        // Poll handling
        const poll = m.pollCreationMessage || m.pollCreationMessageV2;
        if (poll) {
            return (
                <div className="bg-zinc-800/10 dark:bg-zinc-700/50 p-3 rounded-lg w-full min-w-[200px]">
                    <h4 className="font-bold text-sm mb-2 opacity-90">📊 {poll.name}</h4>
                    <ul className="space-y-2">
                        {poll.options.map((opt, i) => (
                            <li key={i} className="px-3 py-2 bg-white dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700 text-xs text-center font-medium">
                                {opt.optionName}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 text-[10px] text-gray-500 text-center">
                        Selectable: {poll.selectableCount}
                    </div>
                </div>
            );
        }

        // Standard Text
        if (m.conversation) return <p className="whitespace-pre-wrap">{m.conversation}</p>;
        if (m.extendedTextMessage?.text) return <p className="whitespace-pre-wrap">{m.extendedTextMessage.text}</p>;

        // Media
        if (m.imageMessage) return (
            <div className="flex flex-col">
                <div className="bg-gray-200 dark:bg-zinc-700 w-48 h-48 rounded-lg flex items-center justify-center mb-1">
                    <PhotoIcon className="w-10 h-10 opacity-50" />
                </div>
                <span className="text-xs opacity-70 italic">Image attachment</span>
                {m.imageMessage.caption && <p className="mt-1">{m.imageMessage.caption}</p>}
            </div>
        );

        return <span className="text-gray-500 italic">[Media/Other Message Type]</span>;
    };

    return (
        <div className="flex w-full h-full bg-black text-white relative font-sans overflow-hidden">

            {/* Consent Modal */}
            {showConsentModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 max-w-md w-full rounded-2xl p-6 shadow-2xl">
                        <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <InformationCircleIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-center mb-2">Sync Contacts & Chats?</h2>
                        <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
                            To provide a rich messaging experience (names, avatars, history), this tool fetches contact data from your WhatsApp session. This data is processed locally and securely.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={acceptConsent}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition flex items-center justify-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                I Agree, Sync Data
                            </button>
                            <button
                                onClick={() => setShowConsentModal(false)}
                                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition text-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Sidebar */}
            <div className="w-[360px] bg-zinc-900 border-r border-zinc-800 flex flex-col">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Chats</h1>
                    <div className="flex gap-2">
                        <button className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
                            <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Session Selector */}
                <div className="px-4 mb-4">
                    <select
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full bg-zinc-800 text-sm text-gray-300 rounded-lg p-2 border-none outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>{s.id} ({s.status})</option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="px-4 mb-4">
                    <div className="bg-zinc-800 rounded-full h-10 flex items-center px-4">
                        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search Messenger"
                            className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                    {loadingChats ? (
                        <div className="text-center text-gray-500 mt-10 text-xs">Loading conversations...</div>
                    ) : chats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => setSelectedChat(chat.id)}
                            className={`group flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedChat === chat.id ? 'bg-blue-500/10' : 'hover:bg-zinc-800'
                                }`}
                        >
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-lg font-bold mr-3 relative shrink-0">
                                {chat.name ? chat.name[0].toUpperCase() : '?'}
                                {selectedChat === chat.id && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900"></div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-semibold truncate ${selectedChat === chat.id ? 'text-blue-400' : 'text-gray-200'}`}>
                                    {chat.name || chat.id.split('@')[0]}
                                </h4>
                                <div className="flex justify-between items-center mt-0.5">
                                    <p className="text-xs text-gray-500 truncate max-w-[140px]">
                                        {/* Mock last message */}
                                        Click to view history
                                    </p>
                                    {chat.conversationTimestamp && (
                                        <span className="text-[10px] text-gray-600">
                                            {/* Show short readable time */}
                                            {(() => {
                                                const date = new Date(chat.conversationTimestamp * 1000);
                                                const now = new Date();
                                                const diff = now.getTime() - date.getTime();
                                                if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                return date.toLocaleDateString();
                                            })()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-zinc-950">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold mr-3">
                                    {selectedChat.split('@')[0][0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-200">
                                        {chats.find(c => c.id === selectedChat)?.name || selectedChat.replace('@s.whatsapp.net', '')}
                                    </h3>
                                    <span className="text-xs text-green-500">Active now</span>
                                </div>
                            </div>
                            <div className="flex gap-4 text-blue-500">
                                <PhoneIcon className="w-6 h-6 cursor-pointer hover:text-blue-400" />
                                <VideoCameraIcon className="w-6 h-6 cursor-pointer hover:text-blue-400" />
                                <InformationCircleIcon className="w-6 h-6 cursor-pointer hover:text-blue-400" />
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-2">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                    <p>No messages yet.</p>
                                    <p className="text-sm">Say hello! 👋</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.key.fromMe;
                                    const isNextSame = messages[idx + 1]?.key.fromMe === isMe;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-${isNextSame ? '1' : '4'}`}>
                                            {/* Avatar for receiver */}
                                            {!isMe && !isNextSame && (
                                                <div className="w-8 h-8 rounded-full bg-zinc-700 items-center justify-center flex text-xs mr-2 self-end mb-1">
                                                    {msg.pushName ? msg.pushName[0] : '?'}
                                                </div>
                                            )}
                                            {!isMe && isNextSame && <div className="w-8 h-8 mr-2" />}

                                            <div className={`max-w-[65%] px-4 py-2 ${isMe
                                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                                : 'bg-zinc-800 text-gray-200 rounded-2xl rounded-tl-sm'
                                                }`}>
                                                <div className="text-sm">
                                                    {renderMessageContent(msg)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-3">
                            <div className="flex gap-2 text-blue-500">
                                <PlusIcon className="w-6 h-6 cursor-pointer hover:bg-zinc-800 rounded-full p-1" />
                                <PhotoIcon className="w-6 h-6 cursor-pointer hover:bg-zinc-800 rounded-full p-1" />
                                <PaperClipIcon className="w-6 h-6 cursor-pointer hover:bg-zinc-800 rounded-full p-1" />
                            </div>

                            <form onSubmit={handleSendMessage} className="flex-1 relative">
                                <input
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Aa"
                                    className="w-full bg-zinc-800 text-white rounded-full py-2 px-4 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <FaceSmileIcon className="w-5 h-5 text-gray-400 absolute right-3 top-2.5 cursor-pointer" />
                            </form>

                            {newMessage.trim() ? (
                                <button onClick={handleSendMessage} className="text-blue-500 hover:text-blue-400 transform transition hover:scale-110">
                                    <PaperAirplaneIcon className="w-6 h-6" />
                                </button>
                            ) : (
                                <MicrophoneIcon className="w-6 h-6 text-blue-500 hover:text-blue-400 cursor-pointer" />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 select-none">
                        <ChatBubbleLeftIcon className="w-24 h-24 mb-4 opacity-20" />
                        <h2 className="text-2xl font-bold opacity-30">Welcome to Messenger</h2>
                        <p className="opacity-30">Select a chat to start messaging</p>
                    </div>
                )}
            </div>

        </div>
    );
}

// Simple Icons
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    )
}

function PaperAirplaneIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
    )
}
