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
        <div className="rounded-xl border border-slate-800 bg-slate-900/45 p-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Theme</p>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600"
            >
                <span>{selectedLabel}</span>
                <span className={`text-xs text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>v</span>
            </button>

            {open && (
                <div className="app-scroll mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/80 p-1.5">
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
                                    : 'border-slate-700 bg-slate-900/75 text-slate-300 hover:border-slate-600 hover:text-slate-100'
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
