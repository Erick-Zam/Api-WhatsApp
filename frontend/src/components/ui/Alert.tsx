import type { ReactNode } from 'react';

type AlertTone = 'error' | 'success' | 'info';

interface AlertProps {
    tone?: AlertTone;
    children: ReactNode;
}

const toneClassMap: Record<AlertTone, string> = {
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    info: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
};

export default function Alert({ tone = 'info', children }: AlertProps) {
    return <div className={`rounded-xl border p-3 text-sm ${toneClassMap[tone]}`}>{children}</div>;
}
