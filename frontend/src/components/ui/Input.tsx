import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
}

export default function Input({ label, hint, className = '', id, ...props }: InputProps) {
    return (
        <label className="block">
            {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</span>}
            <input
                id={id}
                {...props}
                className={`w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-400 ${className}`.trim()}
            />
            {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
        </label>
    );
}
