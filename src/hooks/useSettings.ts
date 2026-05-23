'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserSettings, DEFAULT_THEME, NotificationPreferences, PomodoroSettings } from '@/types';
import { getUserSettings, saveUserSettings } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_SETTINGS: UserSettings = {
  theme: DEFAULT_THEME,
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    desktop: true,
    email: false,
    todoReminders: true,
    eventReminders: true,
    dailySummary: false,
    achievementAlerts: true,
    focusMode: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  },
  calendar: {
    defaultView: 'month',
    weekStartsOn: 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    showWeekNumbers: false,
    showDeclinedEvents: false,
    defaultEventDuration: 60,
  },
  todos: {
    defaultView: 'kanban',
    defaultPriority: 'medium',
    showCompletedTasks: true,
    sortBy: 'priority',
    sortOrder: 'desc',
  },
  pomodoro: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true,
    notifyOnComplete: true,
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    keyboardNavigation: true,
  },
};

export const useSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getUserSettings(user.uid).then((s) => {
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
      setLoading(false);
    });
  }, [user]);

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    if (user) {
      setSaving(true);
      try {
        await saveUserSettings(user.uid, partial);
      } finally {
        setSaving(false);
      }
    }
  }, [settings, user]);

  const exportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexus-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const importSettings = useCallback(async (json: string) => {
    try {
      const parsed = JSON.parse(json) as Partial<UserSettings>;
      await updateSettings(parsed);
      return true;
    } catch {
      return false;
    }
  }, [updateSettings]);

  return { settings, loading, saving, updateSettings, exportSettings, importSettings };
};
