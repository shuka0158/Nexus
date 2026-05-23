'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { subscribeToAllEvents } from '@/lib/firestore';
import { requestNotificationPermission } from '@/lib/notifications';
import { CalendarEvent } from '@/types';

const LOOK_AHEAD_MS  = 24 * 60 * 60 * 1000; // schedule reminders up to 24 h ahead
const GRACE_MS       = 5  * 60 * 1000;       // also fire if we're within 5 min past due

function formatDelta(minutes: number): string {
  if (minutes === 0)        return 'starting now';
  if (minutes < 60)         return `in ${minutes} min`;
  if (minutes === 60)       return 'in 1 hour';
  if (minutes % 60 === 0)   return `in ${minutes / 60} hours`;
  return `in ${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

const notifSupported = typeof window !== 'undefined' && typeof Notification !== 'undefined';

function showBrowserNotification(title: string, body: string) {
  if (!notifSupported || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', tag: body });
  } catch {
    // Some browsers block programmatic Notification() — silent fail
  }
}

export const ReminderScheduler: React.FC = () => {
  const { user } = useAuth();
  const { addLocalNotification } = useNotifications();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firedRef  = useRef<Set<string>>(new Set());

  // Auto-request browser notification permission on first load
  useEffect(() => {
    if (!user || !notifSupported) return;
    if (Notification.permission === 'default') {
      requestNotificationPermission(user.uid).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToAllEvents(user.uid, (events: CalendarEvent[]) => {
      // Clear previous timers whenever events change
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      const now = Date.now();

      for (const event of events) {
        const startMs = event.startDate.toDate().getTime();
        // Skip events that already started more than 1 hour ago
        if (startMs < now - 60 * 60 * 1000) continue;

        for (const minutes of (event.reminderMinutes ?? [15])) {
          const fireAt = startMs - minutes * 60 * 1000;
          const delay  = fireAt - now;
          const key    = `${event.id}::${minutes}`;

          // Fire if: scheduled in the future within 24h, OR just missed by <5 min
          const shouldFire = (delay > 0 && delay <= LOOK_AHEAD_MS)
                          || (delay <= 0 && delay > -GRACE_MS);

          if (!shouldFire || firedRef.current.has(key)) continue;

          const actualDelay = Math.max(0, delay);

          const id = setTimeout(async () => {
            firedRef.current.add(key);

            const deltaLabel = formatDelta(minutes);
            const body = `${event.title} — ${deltaLabel}${event.location ? ` · ${event.location}` : ''}`;

            showBrowserNotification('NEXUS Reminder', body);

            try {
              await addLocalNotification({
                type: 'event_reminder',
                title: 'Reminder',
                body,
                actionUrl: '/calendar',
              });
            } catch { /* non-critical */ }
          }, actualDelay);

          timersRef.current.push(id);
        }
      }
    });

    return () => {
      unsub();
      timersRef.current.forEach(clearTimeout);
    };
  }, [user, addLocalNotification]);

  return null; // no UI — pure side-effect component
};
