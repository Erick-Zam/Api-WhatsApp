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
    CheckCircleIcon,
    XMarkIcon,
    ChevronLeftIcon,
} from '@heroicons/react/24/solid';

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
        extendedTextMessage?: { text: string };
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
    const [sessions, setSessions] = useState<WASession[]>([]);
    const [selectedSession, setSelectedSession] = useState('default');
    const [originalChats, setOriginalChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileSessionDrawer, setShowMobileSessionDrawer] = useState(false);
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

    useEffect(() => {
        const token = localStorage.getItem('token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

        if (token) {
            fetch(\\/auth/me\, {
                headers: { 'Authorization': \Bearer \\ }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.api_key) setApiKey(data.user.api_key);
                })
                .catch(err => console.error(err));

            fetch(\\/sessions\, {
                headers: { 'Authorization': \Bearer \\ }
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

    useEffect(() => {
        if (!selectedSession || !apiKey) return;

        setLoadingChats(true);
        fetch(\/api/chats?sessionId=\\, {
            headers: { 'x-api-key': apiKey }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setOriginalChats(data.chats);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingChats(false));
    }, [selectedSession, apiKey]);

    useEffect(() => {
        if (!selectedSession || !selectedChat || !apiKey) return;

        setLoadingMessages(true);
        const encodedJid = encodeURIComponent(selectedChat);
        fetch(\/api/chats/\/messages?sessionId=\&limit=50\, {
            headers: { 'x-api-key': apiKey }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setMessages(data.messages);
                    scrollToBottom();
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingMessages(false));
    }, [selectedChat, selectedSession, apiKey]);

    const chats = searchTerm ? originalChats.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.includes(searchTerm.toLowerCase())
    ) : originalChats;

    const currentChat = chats.find(c => c.id === selectedChat);

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !apiKey) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        try {
            const res = await fetch(\\/messages/text\, {
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

        if (m.ephemeralMessage) m = m.ephemeralMessage.message;
        if (m?.viewOnceMessage) m = m.viewOnceMessage.message || m.viewOnceMessage.viewOnceMessage?.message;
        if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message || m.viewOnceMessageV2.viewOnceMessage?.message;
        if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;

        if (!m) return <span className="text-gray-500 italic font-light opacity-50">Content unavailable</span>;

        const poll = m.pollCreationMessage || m.pollCreationMessageV2;
        if (poll) {
            return (
                <div className="bg-zinc-800/30 p-3 rounded-xl w-full min-w-[220px] border border-zinc-700/50">
                    <h4 className="font-bold text-sm mb-2 text-cyan-400 flex items-center gap-2">
                        📊 {poll.name}
                    </h4>
                    <ul className="space-y-2">
                        {poll.options.map((opt: { optionName: string }) => (
                            <li key={opt.optionName} className="px-4 py-2.5 bg-zinc-800 rounded-lg border border-zinc-700/30 text-xs text-center font-semibold hover:bg-zinc-700/50 transition-colors">
                                {opt.optionName}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        if (m.conversation) return <p className="whitespace-pre-wrap leading-relaxed">{m.conversation}</p>;
        if (m.extendedTextMessage?.text) return <p className="whitespace-pre-wrap leading-relaxed">{m.extendedTextMessage.text}</p>;

        if (m.imageMessage) return (
            <div className="flex flex-col gap-2">
                <div className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700/30">
                    <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center">
                        <PhotoIcon className="w-12 h-12 text-zinc-600 animate-pulse" />
                    </div>
                </div>
                {m.imageMessage.caption && <p className="text-sm px-1">{m.imageMessage.caption}</p>}
            </div>
        );

        if (m.videoMessage) return (
            <div className="flex flex-col gap-2">
                <div className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700/30 flex items-center justify-center h-32">
                    <VideoCameraIcon className="w-10 h-10 text-zinc-600" />
                </div>
                {m.videoMessage.caption && <p className="text-sm px-1">{m.videoMessage.caption}</p>}
            </div>
        );

        if (m.audioMessage) return (
            <div className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/30">
                <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center shrink-0">
                    <MicrophoneIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-cyan-500 opacity-50"></div>
                    </div>
                </div>
            </div>
        );

        if (m.documentMessage) return (
            <div className="flex items-center gap-3 bg-zinc-800/80 p-3 rounded-xl border border-zinc-700/30">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
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

            {showConsentModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700/50 max-w-md w-full rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-center mb-2">Sync Contacts & Chats?</h2>
                        <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
                            To provide a rich messaging experience (names, avatars, history), this tool fetches contact data from your WhatsApp session.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={acceptConsent}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition"
                            >
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

            {showMobileSessionDrawer && (
                <div className="absolute inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileSessionDrawer(false)} />
                    <div className="absolute left-0 top-0 w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
                        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                            <h3 className="font-bold">Sessions</h3>
                            <button onClick={() => setShowMobileSessionDrawer(false)}>
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                            {sessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setSelectedSession(s.id);
                                        setShowMobileSessionDrawer(false);
                                    }}
                                    className={\w-full p-2 text-left rounded-lg transition \\}
                                >
                                    <div className="font-semibold text-sm">{s.id}</div>
                                    <div className="text-xs text-gray-400">{s.status}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="w-80 bg-zinc-950 border-r border-zinc-800/50 flex flex-col hidden lg:flex">
                <div className="p-4 border-b border-zinc-800/50">
                    <h2 className="text-lg font-bold text-cyan-400">Chats</h2>
                </div>

                <div className="px-4 py-3 border-b border-zinc-800/30">
                    <select
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full bg-zinc-800/70 text-sm text-gray-300 rounded-lg p-2 border border-zinc-700/30 outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>{s.id} ({s.status})</option>
                        ))}
                    </select>
                </div>

                <div className="px-4 py-3 border-b border-zinc-800/30">
                    <div className="bg-zinc-800/50 rounded-lg h-10 flex items-center px-3 border border-zinc-700/30 focus-within:ring-1 focus-within:ring-cyan-500">
                        <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="bg-transparent border-none outline-none text-sm w-full ml-2 placeholder-gray-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                    {loadingChats ? (
                        <div className="flex flex-col items-center justify-center mt-8 space-y-2 opacity-50">
                            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent animate-spin rounded-full"></div>
                            <span className="text-xs font-semibold">Loading...</span>
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center mt-8 text-gray-600">
                            <ChatBubbleLeftIcon className="w-8 h-8 mb-2 opacity-30" />
                            <span className="text-xs">No chats yet</span>
                        </div>
                    ) : (
                        chats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat.id)}
                                className={\w-full text-left p-3 rounded-lg transition-all group \\}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={\w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 \\}>
                                        {chat.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className="text-sm font-semibold truncate">{chat.name || 'Unknown'}</h4>
                                            {chat.conversationTimestamp && (
                                                <span className="text-[10px] text-gray-500 ml-2 shrink-0">
                                                    {(() => {
                                                        const ts = chat.conversationTimestamp > 2000000000 ? chat.conversationTimestamp : chat.conversationTimestamp * 1000;
                                                        const date = new Date(ts);
                                                        if (Number.isNaN(date.getTime())) return '';
                                                        const now = new Date();
                                                        const diff = now.getTime() - date.getTime();
                                                        if (diff < 3600000) return \\m\;
                                                        if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        return 'Yesterday';
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{chat.lastMessage || 'No messages'}</p>
                                    </div>
                                    {chat.unreadCount ? (
                                        <span className="bg-cyan-600 text-[10px] font-bold px-2 py-1 rounded-full text-white shrink-0">
                                            {chat.unreadCount}
                                        </span>
                                    ) : null}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-black">
                {selectedChat ? (
                    <>
                        <div className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-4 lg:px-6 bg-zinc-950/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowMobileSessionDrawer(true)}
                                    className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg transition"
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                                <div>
                                    <h3 className="font-semibold text-gray-100">{currentChat?.name || selectedChat}</h3>
                                    <span className="text-xs text-emerald-500/70">Active now</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-zinc-800/70 rounded-lg transition text-gray-400 hover:text-cyan-400">
                                    <PhoneIcon className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-zinc-800/70 rounded-lg transition text-gray-400 hover:text-cyan-400 hidden md:block">
                                    <VideoCameraIcon className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-zinc-800/70 rounded-lg transition text-gray-400 hover:text-cyan-400">
                                    <InformationCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-3 custom-scrollbar scroll-smooth">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                    <ChatBubbleLeftIcon className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="font-semibold">No messages yet</p>
                                    <p className="text-sm opacity-60">Send a message to start!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.key.fromMe;
                                    const isNextSame = messages[idx + 1]?.key.fromMe === isMe;
                                    return (
                                        <div key={msg.key.id} className={\lex gap-2 \\}>
                                            {!isMe && idx === 0 && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {msg.pushName?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            {!isMe && idx > 0 && messages[idx - 1]?.key.fromMe && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {msg.pushName?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            {!isMe && isNextSame && <div className="w-8 shrink-0" />}

                                            <div className={\max-w-xs lg:max-w-md px-4 py-2 rounded-2xl \\}>
                                                <div className="text-sm leading-relaxed">
                                                    {renderMessageContent(msg)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="border-t border-zinc-800/50 bg-zinc-950/50 p-4 backdrop-blur-sm">
                            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                                <div className="flex gap-2 text-gray-600">
                                    <button type="button" className="p-2 hover:bg-zinc-800 rounded-lg transition hover:text-cyan-400">
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 relative">
                                    <input
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full bg-zinc-800/70 border border-zinc-700/30 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-gray-600 text-sm"
                                    />
                                </div>

                                {newMessage.trim() ? (
                                    <button type="submit" className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition font-semibold">
                                        <SendIcon className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button type="button" className="p-2.5 hover:bg-zinc-800 text-gray-600 rounded-lg transition hover:text-cyan-400">
                                        <MicrophoneIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-700">
                        <ChatBubbleLeftIcon className="w-24 h-24 mb-4 opacity-10" />
                        <h2 className="text-2xl font-bold opacity-30">Welcome to Chats</h2>
                        <p className="opacity-30 text-sm mt-1">Select a chat to start messaging</p>
                    </div>
                )}
            </div>

            {selectedChat && (
                <div className="w-80 bg-zinc-950 border-l border-zinc-800/50 flex flex-col hidden xl:flex">
                    <div className="h-16 border-b border-zinc-800/50 flex items-center px-6">
                        <h3 className="font-semibold text-gray-200">Details</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        <div className="text-center">
                            <div className={\w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold \\}>
                                {currentChat?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <h4 className="font-bold text-lg text-gray-100">{currentChat?.name || selectedChat}</h4>
                            <p className="text-xs text-gray-500 mt-1">{currentChat?.isGroup ? 'Group' : 'Phone'}</p>
                        </div>

                        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/30">
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Session</h5>
                            <p className="text-sm text-gray-200">{selectedSession}</p>
                        </div>

                        {currentChat?.conversationTimestamp && (
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/30">
                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Last Activity</h5>
                                <p className="text-sm text-gray-200">
                                    {new Date((currentChat.conversationTimestamp > 2000000000 ? currentChat.conversationTimestamp : currentChat.conversationTimestamp * 1000)).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <div className="pt-4 space-y-2 border-t border-zinc-800/30">
                            <button className="w-full py-2 px-4 bg-zinc-800/50 hover:bg-zinc-800 text-gray-200 rounded-lg text-sm font-medium transition">
                                Mute notifications
                            </button>
                            <button className="w-full py-2 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-sm font-medium transition">
                                Clear chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function PlusIcon({ className }: { readonly className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    );
}

function SendIcon({ className }: { readonly className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
    );
}
