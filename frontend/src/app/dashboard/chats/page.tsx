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
    imgUrl?: string;
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
        imageMessage?: { caption?: string; url?: string };
        videoMessage?: { caption?: string; url?: string };
        audioMessage?: { url?: string };
        documentMessage?: { fileName?: string; mimetype?: string; url?: string };
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
        ephemeralMessage?: { message: Message['message'] };
        viewOnceMessage?: { message: Message['message']; viewOnceMessage?: { message: Message['message'] } };
        viewOnceMessageV2?: { message: Message['message']; viewOnceMessage?: { message: Message['message'] } };
        documentWithCaptionMessage?: { message: Message['message'] };
    };
    pushName?: string;
    messageTimestamp?: number;
}

interface WASession {
    id: string;
    status: string;
}

export default function ChatsPage() {
    // State
    const [sessions, setSessions] = useState<WASession[]>([]);
    const [selectedSession, setSelectedSession] = useState('default');
    const [originalChats, setOriginalChats] = useState<Chat[]>([]); // Source of truth
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Consent Modal State - initialized from localStorage to avoid cascading render in useEffect
    const [showConsentModal, setShowConsentModal] = useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem('chat_data_consent');
        }
        return false;
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // 1. Initial Load & Auth
    useEffect(() => {
        const token = localStorage.getItem('token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

        if (token) {
            // Get API Key
            fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.api_key) setApiKey(data.user.api_key);
                })
                .catch(err => console.error(err));

            // Get Sessions
            fetch(`${API_URL}/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSessions(data);
                        const connected = data.find((s: WASession) => s.status === 'CONNECTED');
                        if (connected) setSelectedSession(connected.id);
                    }
                })
                .catch(err => console.error(err));
        }
    }, []);

    // 2. Load Chats
    useEffect(() => {
        if (!selectedSession || !apiKey) return;

        Promise.resolve().then(() => setLoadingChats(true));
        fetch(`/api/chats?sessionId=${selectedSession}`, {
            headers: { 'x-api-key': apiKey }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // API now returns pre-sorted and enriched chats
                    setOriginalChats(data.chats);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingChats(false));
    }, [selectedSession, apiKey]);

    // Derive filtered chats
    const chats = searchTerm ? originalChats.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.includes(searchTerm.toLowerCase())
    ) : originalChats;

    // 3. Load Messages
    useEffect(() => {
        if (!selectedSession || !selectedChat || !apiKey) return;

        Promise.resolve().then(() => setLoadingMessages(true));
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

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !apiKey) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        try {
            const res = await fetch(`${API_URL}/messages/text`, {
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
        }
    };

    const acceptConsent = () => {
        localStorage.setItem('chat_data_consent', 'true');
        setShowConsentModal(false);
    };

    const renderMessageContent = (msg: Message) => {
        let m = msg.message;
        if (!m) return <span className="text-gray-500 italic font-light opacity-50">Empty message</span>;

        // Unwrap common wrappers
        if (m.ephemeralMessage) m = m.ephemeralMessage.message;
        if (m?.viewOnceMessage) m = m.viewOnceMessage.message || m.viewOnceMessage.viewOnceMessage?.message;
        if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message || m.viewOnceMessageV2.viewOnceMessage?.message;
        if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;

        if (!m) return <span className="text-gray-500 italic font-light opacity-50">Content unavailable</span>;

        // Poll handling
        const poll = m.pollCreationMessage || m.pollCreationMessageV2;
        if (poll) {
            return (
                <div className="bg-zinc-800/20 dark:bg-zinc-900/40 p-3 rounded-xl w-full min-w-[220px] border border-zinc-700/50">
                    <h4 className="font-bold text-sm mb-2 text-blue-400 flex items-center gap-2">
                        <span className="text-lg">📊</span> {poll.name}
                    </h4>
                    <ul className="space-y-2">
                        {poll.options.map((opt: { optionName: string }) => (
                            <li key={opt.optionName} className="px-4 py-2.5 bg-zinc-800 dark:bg-zinc-800/80 rounded-lg border border-zinc-700 text-xs text-center font-semibold hover:bg-zinc-700 transition-colors">
                                {opt.optionName}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 text-[10px] text-zinc-500 text-center font-medium uppercase tracking-wider">
                        Selectable: {poll.selectableCount}
                    </div>
                </div>
            );
        }

        // Standard Text
        if (m.conversation) return <p className="whitespace-pre-wrap leading-relaxed">{m.conversation}</p>;
        if (m.extendedTextMessage?.text) return <p className="whitespace-pre-wrap leading-relaxed">{m.extendedTextMessage.text}</p>;

        // Image
        if (m.imageMessage) return (
            <div className="flex flex-col gap-2">
                <div className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                    {/* Placeholder for real image display if URL is provided by backend later */}
                    <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center">
                        <PhotoIcon className="w-12 h-12 text-zinc-600 animate-pulse" />
                    </div>
                </div>
                {m.imageMessage.caption && <p className="text-sm px-1">{m.imageMessage.caption}</p>}
                <div className="flex items-center gap-1.5 opacity-60 text-[10px] font-bold uppercase tracking-tight">
                    <PhotoIcon className="w-3 h-3" /> Image Attachment
                </div>
            </div>
        );

        // Video
        if (m.videoMessage) return (
            <div className="flex flex-col gap-2">
                <div className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center h-32">
                    <VideoCameraIcon className="w-10 h-10 text-zinc-600" />
                </div>
                {m.videoMessage.caption && <p className="text-sm px-1">{m.videoMessage.caption}</p>}
                <div className="flex items-center gap-1.5 opacity-60 text-[10px] font-bold uppercase tracking-tight">
                    <VideoCameraIcon className="w-3 h-3" /> Video Attachment
                </div>
            </div>
        );

        // Audio
        if (m.audioMessage) return (
            <div className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/30">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shrink-0">
                    <MicrophoneIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-blue-500 opacity-50"></div>
                    </div>
                    <span className="text-[10px] font-bold opacity-60 mt-1 block">AUDIO MESSAGE</span>
                </div>
            </div>
        );

        // Document
        if (m.documentMessage) return (
            <div className="flex items-center gap-3 bg-zinc-800/80 p-3 rounded-xl border border-zinc-700">
                <div className="w-10 h-10 bg-zinc-700 text-zinc-300 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
                    <PaperClipIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{m.documentMessage.fileName || 'document.pdf'}</p>
                    <p className="text-[10px] opacity-60 font-medium uppercase">{m.documentMessage.mimetype?.split('/')[1] || 'FILE'}</p>
                </div>
            </div>
        );

        return (
            <div className="flex items-center gap-2 opacity-60 italic text-xs py-1">
                <InformationCircleIcon className="w-4 h-4" />
                <span>Unsupported message type</span>
            </div>
        );
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
                        <div className="flex flex-col items-center justify-center mt-10 space-y-3 opacity-40">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                            <div className="text-xs font-bold uppercase tracking-widest">Syncing sessions...</div>
                        </div>
                    ) : chats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => setSelectedChat(chat.id)}
                            className={`group w-full text-left flex items-center p-3 rounded-2xl transition-all duration-200 ${selectedChat === chat.id ? 'bg-blue-600/20 ring-1 ring-blue-500/30' : 'hover:bg-zinc-800/70 hover:translate-x-1'
                                }`}
                        >
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mr-3 relative shrink-0 shadow-lg ${chat.isGroup ? 'bg-gradient-to-tr from-emerald-600 to-teal-500' : 'bg-gradient-to-br from-zinc-700 to-zinc-600'}`}>
                                {chat.name ? chat.name[0].toUpperCase() : '?'}
                                {selectedChat === chat.id && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-900 shadow-sm animate-pulse"></div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h4 className={`text-sm font-bold truncate ${selectedChat === chat.id ? 'text-blue-400' : 'text-zinc-100'}`}>
                                        {chat.name}
                                    </h4>
                                    {chat.conversationTimestamp && (
                                        <span className="text-[10px] font-bold text-zinc-600 whitespace-nowrap ml-2">
                                            {(() => {
                                                // Handle Baileys timestamps (seconds) safely
                                                const ts = chat.conversationTimestamp > 2000000000 ? chat.conversationTimestamp : chat.conversationTimestamp * 1000;
                                                const date = new Date(ts);
                                                if (Number.isNaN(date.getTime())) return '';
                                                
                                                const now = new Date();
                                                const diff = now.getTime() - date.getTime();
                                                if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                if (diff < 172800000) return 'Yesterday';
                                                return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                                            })()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate max-w-[180px] font-medium leading-tight ${selectedChat === chat.id ? 'text-blue-300/60' : 'text-zinc-500'}`}>
                                        {chat.lastMessage}
                                    </p>
                                    {chat.unreadCount ? (
                                        <span className="bg-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white min-w-[18px] text-center ml-2">
                                            {chat.unreadCount}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </button>
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
                            {(() => {
                                if (loadingMessages) {
                                    return (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                        </div>
                                    );
                                }
                                if (messages.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                            <p>No messages yet.</p>
                                            <p className="text-sm">Say hello! 👋</p>
                                        </div>
                                    );
                                }
                                return messages.map((msg, idx) => {
                                    const isMe = msg.key.fromMe;
                                    const isNextSame = messages[idx + 1]?.key.fromMe === isMe;
                                    return (
                                        <div key={msg.key.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-${isNextSame ? '1' : '4'}`}>
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
                                });
                            })()}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-3">
                            <div className="flex gap-2 text-blue-500">
                                <PlusIcon className="w-6 h-6 cursor-pointer hover:bg-zinc-800 rounded-full p-1" />
                                <PhotoIcon className="w-6 h-6 cursor-pointer hover:bg-zinc-800 rounded-full p-1" />
                                <PaperClipIcon className="w-6 h-6 cursor-pointer hover:bg-zinc-800 rounded-full p-1" />
                            </div>

                            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Aa"
                                        className="w-full bg-zinc-800 text-white rounded-full py-2 px-4 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <FaceSmileIcon className="w-5 h-5 text-gray-400 absolute right-3 top-2.5 cursor-pointer" />
                                </div>

                                {newMessage.trim() ? (
                                    <button type="submit" className="text-blue-500 hover:text-blue-400 transform transition hover:scale-110">
                                        <PaperAirplaneIcon className="w-6 h-6" />
                                    </button>
                                ) : (
                                    <button type="button" className="text-blue-500 hover:text-blue-400 cursor-pointer">
                                        <MicrophoneIcon className="w-6 h-6" />
                                    </button>
                                )}
                            </form>
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
function PlusIcon({ className }: { readonly className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    )
}

function PaperAirplaneIcon({ className }: { readonly className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
    )
}
