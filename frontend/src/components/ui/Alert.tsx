import type { ReactNode } from 'react';

type AlertTone = 'error' | 'success' | 'info';

interface AlertProps {
    tone?: AlertTone;
    title?: string;
    children: ReactNode;
}

const toneClassMap: Record<AlertTone, string> = {
    error: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    info: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
};

export default function Alert({ tone = 'info', title, children }: AlertProps) {
    return (
        <div className={`rounded-xl border px-4 py-3 text-sm ${toneClassMap[tone]}`}>
            {title && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]">{title}</p>}
            <div>{children}</div>
        </div>
    );
}
