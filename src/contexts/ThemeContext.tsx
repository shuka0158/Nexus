'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_THEME, ThemeConfig } from '@/types';
import { useAuth } from './AuthContext';
import { saveUserSettings, subscribeToUserSettings } from '@/lib/firestore';

interface ThemeContextType {
  theme: ThemeConfig;
  isDark: boolean;
  updateTheme: (partial: Partial<ThemeConfig>) => void;
  applyPreset: (preset: ThemeConfig['preset']) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

const PRESETS: Record<ThemeConfig['preset'], Partial<ThemeConfig>> = {
  'cyber-blue':    { accentColor: '#00d4ff', secondaryColor: '#0284c7', backgroundType: 'particles' },
  'neon-purple':   { accentColor: '#a855f7', secondaryColor: '#ec4899', backgroundType: 'mesh' },
  'acid-green':    { accentColor: '#22c55e', secondaryColor: '#14b8a6', backgroundType: 'grid' },
  'crimson-red':   { accentColor: '#ef4444', secondaryColor: '#f97316', backgroundType: 'particles' },
  'gold-amber':    { accentColor: '#eab308', secondaryColor: '#f97316', backgroundType: 'gradient' },
  'teal-wave':     { accentColor: '#14b8a6', secondaryColor: '#0ea5e9', backgroundType: 'mesh' },
  'rose-pink':     { accentColor: '#f43f5e', secondaryColor: '#ec4899', backgroundType: 'mesh' },
  'solar-orange':  { accentColor: '#f97316', secondaryColor: '#eab308', backgroundType: 'gradient' },
  'white-minimal': { accentColor: '#6366f1', secondaryColor: '#8b5cf6', backgroundType: 'solid', colorMode: 'light' },
  'midnight-blue': { accentColor: '#3b82f6', secondaryColor: '#6366f1', backgroundType: 'grid' },
  'custom':        {},
};

const resolveIsDark = (colorMode: ThemeConfig['colorMode']): boolean => {
  if (colorMode === 'dark') return true;
  if (colorMode === 'light') return false;
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserSettings(user.uid, (settings) => {
      if (settings?.theme) setTheme({ ...DEFAULT_THEME, ...settings.theme });
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const dark = resolveIsDark(theme.colorMode);
    setIsDark(dark);
    applyCSSVars(theme, dark);
    const root = document.documentElement;
    if (theme.colorMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme.colorMode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
    }
  }, [theme]);

  const applyCSSVars = (t: ThemeConfig, dark: boolean) => {
    const root = document.documentElement;
    root.style.setProperty('--accent', dark ? '#58a6ff' : '#0969da');
    root.style.setProperty('--accent-secondary', dark ? '#3fb950' : '#1a7f37');
    root.style.setProperty('--glass-opacity', '0');
    root.style.setProperty('--blur-intensity', '0px');
    root.style.setProperty('--font-family', t.fontFamily);
    root.style.setProperty('--bg-body',      dark ? '#000000' : '#ffffff');
    root.style.setProperty('--text-primary',  dark ? '#ffffff' : '#000000');
    root.style.setProperty('--text-muted',    dark ? '#aaaaaa' : '#444444');
    root.style.setProperty('--border-color',  dark ? '#333333' : '#cccccc');
    root.style.setProperty('--surface-bg',    dark ? '#111111' : '#f5f5f5');
  };

  const updateTheme = useCallback(async (partial: Partial<ThemeConfig>) => {
    const next = { ...theme, ...partial };
    setTheme(next);
    if (user) {
      await saveUserSettings(user.uid, { theme: next });
    }
  }, [theme, user]);

  const applyPreset = useCallback((preset: ThemeConfig['preset']) => {
    updateTheme({ ...PRESETS[preset], preset });
  }, [updateTheme]);

  const resetTheme = useCallback(() => {
    updateTheme(DEFAULT_THEME);
  }, [updateTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, updateTheme, applyPreset, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
