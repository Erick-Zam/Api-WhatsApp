import { MicrophoneIcon, PaperClipIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';

interface MessageInputProps {
    newMessage: string;
    onChange: (value: string) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function MessageInput({ newMessage, onChange, onSubmit }: MessageInputProps) {
    const { t } = useTranslation();

    return (
        <div className="border-t border-slate-800/70 bg-slate-950/75 px-3 py-2.5 md:px-5">
            <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-5xl items-end gap-2">
                <button type="button" className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-400 transition hover:border-slate-600 hover:text-white">
                    <PaperClipIcon className="h-5 w-5" />
                </button>
                <div className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/85 px-2 py-1">
                    <input
                        value={newMessage}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        placeholder={t('chats.messages.typeMessage')}
                    />
                </div>
                {newMessage.trim() ? (
                    <button type="submit" className="rounded-xl border border-cyan-300/35 bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110">
                        {t('chats.actions.send')}
                    </button>
                ) : (
                    <button type="button" className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-slate-400 transition hover:border-slate-600 hover:text-white">
                        <MicrophoneIcon className="h-5 w-5" />
                    </button>
                )}
            </form>
        </div>
    );
}
