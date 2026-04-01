import {
    InformationCircleIcon,
    MicrophoneIcon,
    PaperClipIcon,
    PhotoIcon,
    VideoCameraIcon,
} from '@heroicons/react/24/solid';
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
    endRef: React.RefObject<HTMLDivElement | null>;
}

function formatMessageTime(ts?: number) {
    if (!ts) return '';
    const ms = ts > 2_000_000_000 ? ts : ts * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageThread({ messages, loadingMessages, endRef }: MessageThreadProps) {
    return (
        <div className="app-scroll chat-canvas flex-1 overflow-y-auto px-3 py-3 md:px-5 lg:px-7">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5">
                {loadingMessages && <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-400">Loading messages...</div>}
                {!loadingMessages && messages.length === 0 && <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-500">No messages yet.</div>}
                {messages.map((msg) => {
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
                })}
                <div ref={endRef} />
            </div>
        </div>
    );
}
