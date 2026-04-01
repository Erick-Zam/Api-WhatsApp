'use client';

import { useMemo, useState } from 'react';
import { useTheme } from './ThemeProvider';

const THEME_OPTIONS = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'midnight', label: 'Midnight' },
    { id: 'ocean', label: 'Ocean' },
    { id: 'graphite', label: 'Graphite' },
] as const;

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);

    const selectedLabel = useMemo(() => {
        const match = THEME_OPTIONS.find((option) => option.id === theme);
        return match?.label || 'Theme';
    }, [theme]);

    return (
        <div className="theme-card-muted rounded-xl p-2.5">
            <p className="theme-text-muted mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]">Theme</p>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="theme-input flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-semibold transition"
            >
                <span>{selectedLabel}</span>
                <span className={`theme-text-muted text-xs transition-transform ${open ? 'rotate-180' : ''}`}>v</span>
            </button>

            {open && (
                <div className="theme-card-strong app-scroll mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg p-1.5">
                    {THEME_OPTIONS.map((option) => {
                        const active = theme === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    setTheme(option.id);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-xs font-semibold transition ${active
                                    ? 'border-cyan-300/45 bg-cyan-400/20 text-cyan-100'
                                    : 'theme-button-secondary theme-text-muted'
                                    }`}
                            >
                                <span>{option.label}</span>
                                {active && <span className="text-[10px]">active</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
