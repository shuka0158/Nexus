'use client';

import { useState, useCallback, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { createEvent } from '@/lib/firestore';
import { CalendarEvent } from '@/types';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_KEY = 'nexus_gcal_token';
const LAST_SYNC_KEY = 'nexus_gcal_last_sync';

export interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
  colorId?: string;
}

const GCAL_COLORS: Record<string, string> = {
  '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c',
  '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1',
  '9': '#5484ed', '10': '#51b749', '11': '#dc2127',
};

// ─── Token storage ────────────────────────────────────────────────────────────

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) { localStorage.removeItem(TOKEN_KEY); return null; }
    return token;
  } catch { return null; }
}

function storeToken(token: string, expiresIn = 3600) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiry: Date.now() + expiresIn * 1000 - 30000 }));
}

// ─── GSI loader ───────────────────────────────────────────────────────────────

function loadGSI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject();
    if ((window as unknown as { google?: unknown }).google) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google GSI'));
    document.head.appendChild(script);
  });
}

type TokenClient = { requestAccessToken: () => void };

async function getTokenClient(clientId: string, callback: (token: string, expiresIn: number) => void): Promise<TokenClient> {
  await loadGSI();
  const g = (window as unknown as { google: { accounts: { oauth2: { initTokenClient: (cfg: unknown) => TokenClient } } } }).google;
  return g.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CALENDAR_SCOPE,
    callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => {
      if (resp.error || !resp.access_token) throw new Error(resp.error ?? 'No token');
      callback(resp.access_token, resp.expires_in ?? 3600);
    },
  });
}

// ─── Calendar API helpers ─────────────────────────────────────────────────────

async function fetchGCalEvents(token: string, timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '100' });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  return ((await res.json()).items ?? []) as GCalEvent[];
}

export async function pushEventToGoogle(token: string, event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const body = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.allDay
      ? { date: event.startDate.toDate().toISOString().split('T')[0] }
      : { dateTime: event.startDate.toDate().toISOString() },
    end: event.allDay
      ? { date: event.endDate.toDate().toISOString().split('T')[0] }
      : { dateTime: event.endDate.toDate().toISOString() },
  };
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Failed to create Google event: ${res.status}`);
  return (await res.json()).id;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGoogleCalendarSync(userId: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  const [syncing, setSyncing]     = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync]   = useState<Date | null>(null);
  const [importCount, setImportCount] = useState(0);

  useEffect(() => {
    setConnected(!!getStoredToken());
    try {
      const d = localStorage.getItem(LAST_SYNC_KEY);
      if (d) setLastSync(new Date(d));
    } catch { /* */ }
  }, []);

  const login = useCallback(async () => {
    if (!clientId) throw new Error('Google Client ID not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local');
    const client = await getTokenClient(clientId, (token, exp) => {
      storeToken(token, exp);
      setConnected(true);
    });
    client.requestAccessToken();
  }, [clientId]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
    setConnected(false);
    setLastSync(null);
    setImportCount(0);
  }, []);

  const syncImport = useCallback(async (weeksAhead = 4) => {
    const token = getStoredToken();
    if (!token) { setConnected(false); throw new Error('Not authenticated. Please connect Google Calendar first.'); }
    setSyncing(true);
    try {
      const now = new Date();
      const future = new Date(now.getTime() + weeksAhead * 7 * 86400000);
      const events = await fetchGCalEvents(token, now.toISOString(), future.toISOString());

      let imported = 0;
      for (const e of events) {
        const startRaw = e.start.dateTime ?? e.start.date;
        const endRaw   = e.end.dateTime   ?? e.end.date;
        if (!startRaw || !endRaw) continue;
        const allDay = !e.start.dateTime;
        await createEvent({
          userId,
          title:           e.summary ?? 'Untitled',
          description:     e.description ?? '',
          allDay,
          startDate:       Timestamp.fromDate(new Date(startRaw)),
          endDate:         Timestamp.fromDate(new Date(endRaw)),
          color:           e.colorId ? (GCAL_COLORS[e.colorId] ?? '#4285f4') : '#4285f4',
          category:        'google-calendar',
          location:        e.location ?? '',
          recurring:       null,
          reminderMinutes: [],
          attendees:       [],
        });
        imported++;
      }

      const now2 = new Date();
      localStorage.setItem(LAST_SYNC_KEY, now2.toISOString());
      setLastSync(now2);
      setImportCount(imported);
      return imported;
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  const pushEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const token = getStoredToken();
    if (!token) { setConnected(false); throw new Error('Not connected to Google Calendar'); }
    return pushEventToGoogle(token, event);
  }, []);

  return { connected, syncing, lastSync, importCount, clientId, login, disconnect, syncImport, pushEvent };
}
