export interface Chat {
    id: string;
    name?: string;
    unreadCount?: number;
    conversationTimestamp?: number;
    lastMessage?: string;
    isGroup?: boolean;
}

export interface Message {
    key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
    };
    message?: {
        conversation?: string;
        imageMessage?: { caption?: string; url?: string };
        videoMessage?: { caption?: string; url?: string };
        audioMessage?: { url?: string; seconds?: number };
        documentMessage?: { fileName?: string; mimetype?: string; url?: string };
        extendedTextMessage?: {
            text: string;
            contextInfo?: {
                stanzaId?: string;
                participant?: string;
                quotedMessage?: {
                    conversation?: string;
                    extendedTextMessage?: { text?: string };
                    imageMessage?: { caption?: string };
                    videoMessage?: { caption?: string };
                    documentMessage?: { fileName?: string };
                };
            };
        };
        reactionMessage?: {
            text?: string;
            key?: {
                id?: string;
                remoteJid?: string;
                fromMe?: boolean;
            };
        };
        protocolMessage?: {
            type?: number;
            key?: {
                id?: string;
            };
        };
    };
    pushName?: string;
    messageTimestamp?: number;
}

export interface WASession {
    id: string;
    status: string;
}

export const formatChatTime = (ts?: number) => {
    if (!ts) return '';
    const ms = ts > 2_000_000_000 ? ts : ts * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};
