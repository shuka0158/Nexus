import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { saveFCMToken } from './firestore';

export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async (uid: string): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  // FCM token is optional — failures here don't block browser notifications
  try {
    if (messaging && VAPID_KEY) {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) await saveFCMToken(uid, token);
    }
  } catch {
    // FCM unavailable (no VAPID key / Spark plan) — browser notifications still work
  }

  return true;
};

export const onForegroundMessage = (cb: (payload: unknown) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
};

export const showLocalNotification = (title: string, body: string, options?: NotificationOptions) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    ...options,
  });
};

export const scheduleNotification = (
  title: string,
  body: string,
  delayMs: number,
  options?: NotificationOptions
): ReturnType<typeof setTimeout> => {
  return setTimeout(() => showLocalNotification(title, body, options), delayMs);
};
