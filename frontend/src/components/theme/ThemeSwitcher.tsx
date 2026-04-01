'use client';

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

    return (
        <div className="rounded-2xl surface-card p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Theme</p>
            <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((option) => {
                    const active = theme === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => setTheme(option.id)}
                            className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${active
                                ? 'border-cyan-300/45 bg-cyan-400/20 text-cyan-100'
                                : 'border-slate-700 bg-slate-900/75 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
