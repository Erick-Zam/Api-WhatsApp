import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    iconLeft?: ReactNode;
    loading?: boolean;
}

const variantClassMap: Record<ButtonVariant, string> = {
    primary: 'border border-cyan-300/20 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110',
    secondary: 'border border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-600 hover:bg-slate-800/80',
    danger: 'border border-rose-400/30 bg-rose-500/80 text-white hover:bg-rose-500',
    ghost: 'border border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/70',
};

const sizeClassMap: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-5 text-sm',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    iconLeft,
    loading = false,
    className = '',
    children,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClassMap[variant]} ${sizeClassMap[size]} ${className}`.trim()}
        >
            {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : iconLeft}
            {children}
        </button>
    );
}
