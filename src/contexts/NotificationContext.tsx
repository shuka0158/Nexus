'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppNotification } from '@/types';
import { useAuth } from './AuthContext';
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
} from '@/lib/firestore';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/notifications';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  requestPermission: () => Promise<boolean>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addLocalNotification: (notif: Omit<AppNotification, 'id' | 'userId' | 'createdAt' | 'read'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onForegroundMessage((payload: unknown) => {
      const p = payload as { notification?: { title?: string; body?: string } };
      if (p.notification) {
        toast(p.notification.body ?? '', {
          duration: 5000,
          icon: '🔔',
        });
      }
    });
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const requestPermission = async (): Promise<boolean> => {
    if (!user) return false;
    return requestNotificationPermission(user.uid);
  };

  const markRead = async (id: string) => {
    if (!user) return;
    await markNotificationRead(user.uid, id);
  };

  const markAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  const addLocalNotification = async (
    notif: Omit<AppNotification, 'id' | 'userId' | 'createdAt' | 'read'>
  ) => {
    if (!user) return;
    await addNotification(user.uid, { ...notif, userId: user.uid, read: false });
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      requestPermission,
      markRead,
      markAllRead,
      addLocalNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
