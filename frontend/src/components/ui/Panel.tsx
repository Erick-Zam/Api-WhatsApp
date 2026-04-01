import type { ReactNode } from 'react';

interface PanelProps {
    children: ReactNode;
    className?: string;
    elevated?: boolean;
}

export default function Panel({ children, className = '', elevated = false }: PanelProps) {
    return <div className={`rounded-2xl ${elevated ? 'surface-card--elevated' : 'surface-card'} ${className}`}>{children}</div>;
}
