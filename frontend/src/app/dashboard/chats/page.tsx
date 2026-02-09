'use client';
import { useState, useEffect, useRef } from 'react';

// Types
interface Chat {
    id: string;
    name?: string;
    unreadCount?: number;
    conversationTimestamp?: number;
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
    };
    pushName?: string;
    messageTimestamp?: number;
}

export default function ChatsPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState('default');
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [apiKey, setApiKey] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load: Sessions & API Key
    useEffect(() => {
        // API Key
        const token = localStorage.getItem('token');
        if (token) {
            fetch('http://localhost:3001/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.api_key) setApiKey(data.user.api_key);
                })
                .catch(err => console.error(err));
        }

        // Sessions
        if (token) {
            fetch('http://localhost:3001/sessions', {
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

    // Load Chats when session changes
    useEffect(() => {
        if (!selectedSession || !apiKey) return;

        setLoadingChats(true);
        fetch(`http://localhost:3001/chats?sessionId=${selectedSession}`, {
            headers: { 'x-api-key': apiKey }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Sort by timestamp desc
                    const sorted = data.chats.sort((a: Chat, b: Chat) =>
                        (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0)
                    );
                    setChats(sorted);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingChats(false));
    }, [selectedSession, apiKey]);

    // Load Messages when chat selected
    useEffect(() => {
        if (!selectedSession || !selectedChat || !apiKey) return;

        setLoadingMessages(true);
        // Encode JID properly
        const encodedJid = encodeURIComponent(selectedChat);
        fetch(`http://localhost:3001/chats/${encodedJid}/messages?sessionId=${selectedSession}&limit=50`, {
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
            const res = await fetch('http://localhost:3001/messages/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    sessionId: selectedSession,
                    phone: selectedChat.replace('@s.whatsapp.net', ''), // API formatJid handles this but let's be safe
                    message: newMessage
                })
            });
            const data = await res.json();
            if (data.success) {
                setNewMessage('');
                // Optimistically add message or re-fetch?
                // Let's re-fetch for now or add to state
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

    const getMessageContent = (msg: Message) => {
        if (!msg.message) return '[Unknown message type]';
        if (msg.message.conversation) return msg.message.conversation;
        if (msg.message.extendedTextMessage) return msg.message.extendedTextMessage.text;
        if (msg.message.imageMessage) return '📷 [Image]';
        if (msg.message.videoMessage) return '🎥 [Video]';
        if (msg.message.audioMessage) return '🎵 [Audio]';
        if (msg.message.documentMessage) return '📄 [Document]';
        return '[Media/Other]';
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-gray-100 dark:bg-black rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-zinc-800">
            {/* Sidebar: Chats List */}
            <div className="w-1/3 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                    <h2 className="text-xl font-bold mb-4 dark:text-white">Chats</h2>

                    {/* Session Selector */}
                    <div className="mb-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold">Session</label>
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="w-full mt-1 p-2 rounded bg-white dark:bg-black border border-gray-300 dark:border-zinc-700 text-sm dark:text-white"
                        >
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{s.id} ({s.status})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingChats ? (
                        <div className="p-4 text-center text-gray-500">Loading chats...</div>
                    ) : chats.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No chats found in this session store.</div>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat.id)}
                                className={`p-4 border-b border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedChat === chat.id ? 'bg-blue-50 dark:bg-zinc-800' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
                                        {chat.name || chat.id.replace('@s.whatsapp.net', '')}
                                    </div>
                                    {chat.conversationTimestamp && (
                                        <div className="text-xs text-gray-400">
                                            {new Date(chat.conversationTimestamp * 1000).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 truncate mt-1">
                                    {/* Can't easily preview last message without more complex store logic */}
                                    View conversation
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Conversation */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-black">
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center shadow-sm z-10">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg mr-3">
                                {selectedChat.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold dark:text-white">{selectedChat.replace('@s.whatsapp.net', '')}</h3>
                                <p className="text-xs text-green-500 flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                    Online (Simulated)
                                </p>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingMessages ? (
                                <div className="text-center text-gray-500 mt-10">Loading messages...</div>
                            ) : messages.map((msg, index) => {
                                const isMe = msg.key.fromMe;
                                return (
                                    <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${isMe
                                            ? 'bg-green-100 dark:bg-green-900 text-gray-800 dark:text-gray-100 rounded-tr-none'
                                            : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 rounded-tl-none'
                                            }`}>
                                            <div className="text-sm">
                                                {getMessageContent(msg)}
                                            </div>
                                            <div className="text-[10px] text-right mt-1 opacity-70">
                                                {msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
                            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 p-3 rounded-full border border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-black dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className={`p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg ${sending ? 'opacity-50' : ''}`}
                                >
                                    {sending ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-20 h-20 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">💬</span>
                        </div>
                        <p className="text-lg font-medium">Select a chat to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
