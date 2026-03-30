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

export default function MessageThread({ messages, loadingMessages, endRef }: MessageThreadProps) {
    return (
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
            <div ref={endRef} />
        </div>
    );
}
