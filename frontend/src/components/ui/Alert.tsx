import type { ReactNode } from 'react';

type AlertTone = 'error' | 'success' | 'info';

interface AlertProps {
    tone?: AlertTone;
    title?: string;
    children: ReactNode;
}

const toneClassMap: Record<AlertTone, string> = {
    error: 'theme-badge-danger',
    success: 'theme-badge-success',
    info: 'theme-badge-info',
};

export default function Alert({ tone = 'info', title, children }: AlertProps) {
    return (
        <div className={`rounded-xl border px-4 py-3 text-sm ${toneClassMap[tone]}`}>
            {title && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]">{title}</p>}
            <div>{children}</div>
        </div>
    );
}
