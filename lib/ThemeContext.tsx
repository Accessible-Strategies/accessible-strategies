'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'hc';

interface ThemeContextValue {
  theme:       Theme;
  setTheme:    (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'as-theme';

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'hc';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  // On mount — read from localStorage or respect OS preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) {
      setThemeState(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setThemeState('light');
    }
    // Note: 'hc' is never chosen from OS preference — it's opt-in only,
    // same as before. A stored 'hc' value is respected on return visits.
  }, []);

  // Apply theme as data-theme on <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
  }

  // Kept for any existing callers — cycles dark/light only, same as before.
  // If something currently calls this expecting it to reach 'hc', it won't;
  // 'hc' is meant to be chosen explicitly via setTheme (see Settings panel).
  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}