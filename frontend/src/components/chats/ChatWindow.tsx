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
            <div className="h-16 border-b border-zinc-800/60 bg-zinc-950/60 px-4 lg:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button className="lg:hidden rounded-lg p-1.5 hover:bg-zinc-800" onClick={onOpenDrawer}>
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <p className="text-sm font-semibold">{currentChat?.name || selectedChat}</p>
                        <p className="text-xs text-emerald-400/80">Active now</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="rounded-lg p-2 hover:bg-zinc-800"><PhoneIcon className="w-5 h-5 text-zinc-300" /></button>
                    <button className="rounded-lg p-2 hover:bg-zinc-800 hidden md:block"><VideoCameraIcon className="w-5 h-5 text-zinc-300" /></button>
                    <button className="rounded-lg p-2 hover:bg-zinc-800"><InformationCircleIcon className="w-5 h-5 text-zinc-300" /></button>
                </div>
            </div>

            <MessageThread messages={messages} loadingMessages={loadingMessages} endRef={messagesEndRef} />
            <MessageInput newMessage={newMessage} onChange={onNewMessageChange} onSubmit={onSendMessage} />
        </>
    );
}
