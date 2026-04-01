import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
}

export default function Input({ label, hint, error, className = '', id, ...props }: InputProps) {
    return (
        <label className="block">
            {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>}
            <input
                id={id}
                {...props}
                className={`w-full rounded-xl border px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 ${error ? 'border-rose-400/70 bg-rose-950/30 focus:border-rose-300' : 'border-slate-700 bg-slate-900/70 focus:border-cyan-400'} ${className}`.trim()}
            />
            {error ? <span className="mt-1.5 block text-xs text-rose-300">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
        </label>
    );
}
