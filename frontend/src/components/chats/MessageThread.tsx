import {
    InformationCircleIcon,
    MicrophoneIcon,
    PaperClipIcon,
    PhotoIcon,
    VideoCameraIcon,
} from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import type { Message } from './types';

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

interface MessageThreadProps {
    messages: Message[];
    loadingMessages: boolean;
    loadingOlderMessages: boolean;
    hasMoreMessages: boolean;
    messagesError?: string | null;
    onLoadOlderMessages?: () => void;
    endRef: React.RefObject<HTMLDivElement | null>;
}

function formatMessageTime(ts?: number) {
    if (!ts) return '';
    const ms = ts > 2_000_000_000 ? ts : ts * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDate(ts?: number) {
    if (!ts) return '';
    const ms = ts > 2_000_000_000 ? ts : ts * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '';
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function getMessageDateKey(ts?: number) {
    if (!ts) return '';
    const ms = ts > 2_000_000_000 ? ts : ts * 1000;
    const d = new Date(ms);
    return d.toDateString();
}

export default function MessageThread({
    messages,
    loadingMessages,
    loadingOlderMessages,
    hasMoreMessages,
    messagesError,
    onLoadOlderMessages,
    endRef,
}: MessageThreadProps) {
    const { t } = useTranslation();

    return (
        <div className="app-scroll chat-canvas flex-1 overflow-y-auto px-3 py-3 md:px-5 lg:px-7">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5">
                {hasMoreMessages && (
                    <div className="flex justify-center pb-2">
                        <button
                            type="button"
                            className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-600"
                            onClick={onLoadOlderMessages}
                            disabled={loadingOlderMessages}
                        >
                            {loadingOlderMessages ? t('chats.messages.loadingOlder') : t('chats.messages.loadOlder')}
                        </button>
                    </div>
                )}
                {messagesError && (
                    <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-100">
                        <p className="font-semibold">{t('chats.errors.title')}</p>
                        <p className="mt-1 text-xs text-rose-100/80">{messagesError}</p>
                    </div>
                )}
                {loadingMessages && (
                    <>
                        <div className="h-12 rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-900/60 via-slate-800/60 to-slate-900/60" style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
                        <div className="h-12 rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-900/60 via-slate-800/60 to-slate-900/60" style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite 0.3s' }} />
                        <div className="h-12 rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-900/60 via-slate-800/60 to-slate-900/60" style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite 0.6s' }} />
                    </>
                )}
                {!loadingMessages && messages.length === 0 && <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-500">{t('chats.messages.empty')}</div>}
                {messages.length > 0 && (() => {
                    const messagesWithDateSeparators: (typeof messages[0] | { type: 'dateSeparator'; date: string; key: string })[] = [];
                    let lastDateKey = '';
                    
                    messages.forEach((msg) => {
                        const dateKey = getMessageDateKey(msg.messageTimestamp);
                        if (dateKey !== lastDateKey) {
                            messagesWithDateSeparators.push({ type: 'dateSeparator', date: formatMessageDate(msg.messageTimestamp), key: dateKey });
                            lastDateKey = dateKey;
                        }
                        messagesWithDateSeparators.push(msg);
                    });
                    
                    return messagesWithDateSeparators.map((item) => {
                        if ('type' in item && item.type === 'dateSeparator') {
                            return (
                                <div key={`date-${item.key}`} className="flex justify-center py-3">
                                    <span className="inline-block rounded-full border border-slate-700/50 bg-slate-900/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        {item.date}
                                    </span>
                                </div>
                            );
                        }
                        const msg = item;
                        const mine = msg.key.fromMe;
                        return (
                            <div key={msg.key.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] rounded-2xl border px-3.5 py-2.5 text-sm shadow-sm lg:max-w-[70%] ${
                                    mine
                                        ? 'rounded-br-md border-cyan-300/35 bg-gradient-to-r from-cyan-500/90 to-blue-500/85 text-white'
                                        : 'rounded-bl-md border-slate-700/80 bg-slate-900/90 text-slate-100'
                                }`}>
                                    {renderMessageContent(msg)}
                                    <p className={`mt-1 text-[10px] ${mine ? 'text-cyan-50/90' : 'text-slate-500'}`}>
                                        {formatMessageTime(msg.messageTimestamp)}
                                    </p>
                                </div>
                            </div>
                        );
                    });
                })()}
                <div ref={endRef} />
            </div>
        </div>
    );
}
