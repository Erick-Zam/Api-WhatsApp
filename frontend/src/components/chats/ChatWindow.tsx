import {
    ChevronLeftIcon,
    InformationCircleIcon,
    PhoneIcon,
    VideoCameraIcon,
} from '@heroicons/react/24/solid';
import type { Chat, Message } from './types';
import MessageInput from './MessageInput';
import MessageThread from './MessageThread';

interface ChatWindowProps {
    selectedChat: string;
    currentChat?: Chat;
    loadingMessages: boolean;
    messages: Message[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onOpenDrawer: () => void;
    newMessage: string;
    onNewMessageChange: (value: string) => void;
    onSendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function ChatWindow({
    selectedChat,
    currentChat,
    loadingMessages,
    messages,
    messagesEndRef,
    onOpenDrawer,
    newMessage,
    onNewMessageChange,
    onSendMessage,
}: ChatWindowProps) {
    return (
        <>
            <div className="surface-card border-x-0 border-t-0 px-4 py-3 lg:px-6">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button className="rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 lg:hidden" onClick={onOpenDrawer}>
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${currentChat?.isGroup ? 'bg-emerald-500/75 text-white' : 'bg-cyan-400 text-slate-950'}`}>
                        {(currentChat?.name || selectedChat).charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-100">{currentChat?.name || selectedChat}</p>
                        <p className="text-xs text-emerald-300/85">Active now</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white"><PhoneIcon className="h-5 w-5" /></button>
                    <button className="hidden rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white md:block"><VideoCameraIcon className="h-5 w-5" /></button>
                    <button className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white"><InformationCircleIcon className="h-5 w-5" /></button>
                </div>
                </div>
            </div>

            <MessageThread messages={messages} loadingMessages={loadingMessages} endRef={messagesEndRef} />
            <MessageInput newMessage={newMessage} onChange={onNewMessageChange} onSubmit={onSendMessage} />
        </>
    );
}
