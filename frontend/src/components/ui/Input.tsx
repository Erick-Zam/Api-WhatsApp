import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
}

export default function Input({ label, hint, error, className = '', id, ...props }: InputProps) {
    return (
        <label className="block">
            {label && <span className="theme-text-muted mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]">{label}</span>}
            <input
                id={id}
                {...props}
                className={`theme-input w-full rounded-xl border px-4 py-3 outline-none transition ${error ? 'border-rose-400/70 bg-rose-500/12 focus:border-rose-400' : ''} ${className}`.trim()}
            />
            {error ? <span className="mt-1.5 block text-xs text-rose-500">{error}</span> : hint ? <span className="theme-text-soft mt-1.5 block text-xs">{hint}</span> : null}
        </label>
    );
}
