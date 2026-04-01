import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    iconLeft?: ReactNode;
}

const variantClassMap: Record<ButtonVariant, string> = {
    primary: 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-800/70',
};

export default function Button({
    variant = 'primary',
    iconLeft,
    className = '',
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClassMap[variant]} ${className}`.trim()}
        >
            {iconLeft}
            {children}
        </button>
    );
}
