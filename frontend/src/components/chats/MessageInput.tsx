import { MicrophoneIcon, PaperClipIcon } from '@heroicons/react/24/solid';

interface MessageInputProps {
    newMessage: string;
    onChange: (value: string) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function MessageInput({ newMessage, onChange, onSubmit }: MessageInputProps) {
    return (
        <div className="border-t border-zinc-800/60 bg-zinc-950/60 p-4">
            <form onSubmit={onSubmit} className="flex items-end gap-2">
                <button type="button" className="rounded-lg p-2 hover:bg-zinc-800 text-zinc-400">
                    <PaperClipIcon className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <input
                        value={newMessage}
                        onChange={(e) => onChange(e.target.value)}
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
    );
}
