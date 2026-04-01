import type { ReactNode } from 'react';

interface PanelProps {
    children: ReactNode;
    className?: string;
}

export default function Panel({ children, className = '' }: PanelProps) {
    return <div className={`rounded-2xl border border-zinc-800 bg-zinc-950/70 ${className}`}>{children}</div>;
}
