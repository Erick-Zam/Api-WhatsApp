import {
    ArrowsPointingInIcon,
    Bars3BottomLeftIcon,
    ChevronLeftIcon,
    InformationCircleIcon,
    PhoneIcon,
    VideoCameraIcon,
} from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import type { Chat, Message } from './types';
import MessageInput from './MessageInput';
import MessageThread from './MessageThread';

interface ChatWindowProps {
    selectedChat: string;
    currentChat?: Chat;
    loadingMessages: boolean;
    loadingOlderMessages: boolean;
    hasMoreMessages: boolean;
    messagesError?: string | null;
    onLoadOlderMessages?: () => void;
    messages: Message[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onOpenDrawer: () => void;
    onToggleDesktopRail: () => void;
    onToggleDetailsPanel: () => void;
    showDesktopRail: boolean;
    showDetailsPanel: boolean;
    newMessage: string;
    onNewMessageChange: (value: string) => void;
    onSendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function ChatWindow({
    selectedChat,
    currentChat,
    loadingMessages,
    loadingOlderMessages,
    hasMoreMessages,
    messagesError,
    onLoadOlderMessages,
    messages,
    messagesEndRef,
    onOpenDrawer,
    onToggleDesktopRail,
    onToggleDetailsPanel,
    showDesktopRail,
    showDetailsPanel,
    newMessage,
    onNewMessageChange,
    onSendMessage,
}: ChatWindowProps) {
    const { t } = useTranslation();

    return (
        <>
            <div className="border-b border-slate-800/70 bg-slate-950/80 px-3 py-2.5 backdrop-blur md:px-5">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                    <button className="rounded-lg border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 lg:hidden" onClick={onOpenDrawer} aria-label="Open conversation list">
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${currentChat?.isGroup ? 'bg-emerald-500/75 text-white' : 'bg-cyan-400 text-slate-950'}`}>
                        {(currentChat?.name || selectedChat).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">{currentChat?.name || selectedChat}</p>
                        <p className="text-xs text-emerald-300/85">{t('chats.labels.activeNow')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        className="hidden rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white lg:inline-flex"
                        onClick={onToggleDesktopRail}
                        title={showDesktopRail ? t('chats.actions.collapseConversations') : t('chats.actions.expandConversations')}
                    >
                        {showDesktopRail ? <ArrowsPointingInIcon className="h-5 w-5" /> : <Bars3BottomLeftIcon className="h-5 w-5" />}
                    </button>
                    <button className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white"><PhoneIcon className="h-5 w-5" /></button>
                    <button className="hidden rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white md:block"><VideoCameraIcon className="h-5 w-5" /></button>
                    <button
                        type="button"
                        className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white"
                        onClick={onToggleDetailsPanel}
                        title={showDetailsPanel ? t('chats.actions.collapseDetails') : t('chats.actions.expandDetails')}
                    >
                        {showDetailsPanel ? <ArrowsPointingInIcon className="h-5 w-5" /> : <InformationCircleIcon className="h-5 w-5" />}
                    </button>
                </div>
                </div>
            </div>

            <MessageThread
                messages={messages}
                loadingMessages={loadingMessages}
                loadingOlderMessages={loadingOlderMessages}
                hasMoreMessages={hasMoreMessages}
                messagesError={messagesError}
                onLoadOlderMessages={onLoadOlderMessages}
                endRef={messagesEndRef}
            />
            <MessageInput newMessage={newMessage} onChange={onNewMessageChange} onSubmit={onSendMessage} />
        </>
    );
}
