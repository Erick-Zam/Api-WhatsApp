'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppTheme = 'dark' | 'light' | 'midnight' | 'ocean' | 'graphite';

interface ThemeContextValue {
    theme: AppTheme;
    setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'ui_theme';
const APP_THEMES: AppTheme[] = ['dark', 'light', 'midnight', 'ocean', 'graphite'];

const getInitialTheme = (): AppTheme => {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    return storedTheme && APP_THEMES.includes(storedTheme) ? storedTheme : 'dark';
};

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<AppTheme>(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

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
