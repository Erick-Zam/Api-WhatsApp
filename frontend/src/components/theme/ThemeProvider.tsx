'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppTheme = 'dark' | 'light' | 'midnight' | 'ocean' | 'graphite';

interface ThemeContextValue {
    theme: AppTheme;
    setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'ui_theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<AppTheme>('dark');

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
        const resolvedTheme: AppTheme = storedTheme && ['dark', 'light', 'midnight', 'ocean', 'graphite'].includes(storedTheme)
            ? storedTheme
            : 'dark';

        setThemeState(resolvedTheme);
        document.documentElement.setAttribute('data-theme', resolvedTheme);
    }, []);

    const setTheme = (nextTheme: AppTheme) => {
        setThemeState(nextTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }
        document.documentElement.setAttribute('data-theme', nextTheme);
    };

    const value = useMemo(() => ({ theme, setTheme }), [theme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }
    return context;
};
