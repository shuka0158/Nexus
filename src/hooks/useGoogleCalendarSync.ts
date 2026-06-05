'use client';

import { useState, useCallback, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { createEvent, getEvents } from '@/lib/firestore';
import { CalendarEvent } from '@/types';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');
const ACCOUNTS_KEY = 'nexus_gcal_accounts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectedAccount {
  email: string;
  token: string;
  expiry: number;          // ms timestamp
  lastSync: string | null; // ISO
  importCount: number;
}

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

// ─── Storage ──────────────────────────────────────────────────────────────────

function getStoredAccounts(): ConnectedAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const accounts = JSON.parse(raw) as ConnectedAccount[];
    // Drop accounts whose token has expired — caller must re-auth
    return accounts.filter((a) => Date.now() < a.expiry);
  } catch { return []; }
}

function saveAccounts(accounts: ConnectedAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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

type TokenClient = { requestAccessToken: (opts?: { prompt?: string }) => void };
interface OAuth2API {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
  }) => TokenClient;
}

async function getEmailForToken(token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch account email');
  const data = await res.json();
  return data.email as string;
}

async function requestAccountToken(clientId: string): Promise<ConnectedAccount> {
  await loadGSI();
  const g = (window as unknown as { google: { accounts: { oauth2: OAuth2API } } }).google;
  return new Promise<ConnectedAccount>((resolve, reject) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      // Force the picker so the user can choose a DIFFERENT Google account each time
      prompt: 'select_account',
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? 'No access token returned'));
          return;
        }
        try {
          const email = await getEmailForToken(resp.access_token);
          resolve({
            email,
            token: resp.access_token,
            expiry: Date.now() + (resp.expires_in ?? 3600) * 1000 - 30_000,
            lastSync: null,
            importCount: 0,
          });
        } catch (err) {
          reject(err);
        }
      },
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

// ─── Calendar API helpers ─────────────────────────────────────────────────────

async function fetchGCalEvents(token: string, timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '100',
  });
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
  const [accounts, setAccounts]   = useState<ConnectedAccount[]>([]);
  const [syncingEmail, setSyncingEmail] = useState<string | null>(null);

  // Load accounts on mount
  useEffect(() => { setAccounts(getStoredAccounts()); }, []);

  const persist = (next: ConnectedAccount[]) => {
    saveAccounts(next);
    setAccounts(next);
  };

  const addAccount = useCallback(async () => {
    if (!clientId) throw new Error('Google Client ID not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local');
    const acc = await requestAccountToken(clientId);
    const current = getStoredAccounts();
    // Replace existing entry for this email if present (re-auth flow), otherwise append
    const next = [...current.filter((a) => a.email !== acc.email), acc];
    persist(next);
    return acc;
  }, [clientId]);

  const removeAccount = useCallback((email: string) => {
    persist(getStoredAccounts().filter((a) => a.email !== email));
  }, []);

  const syncAccount = useCallback(async (email: string, weeksAhead = 4): Promise<number> => {
    const all = getStoredAccounts();
    const acc = all.find((a) => a.email === email);
    if (!acc) throw new Error(`Account ${email} is not connected.`);
    if (Date.now() > acc.expiry) {
      throw new Error(`Session expired for ${email}. Please reconnect this account.`);
    }

    setSyncingEmail(email);
    try {
      const now = new Date();
      const future = new Date(now.getTime() + weeksAhead * 7 * 86_400_000);
      const gEvents = await fetchGCalEvents(acc.token, now.toISOString(), future.toISOString());

      // Dedupe against events already in Firestore for this user
      const existing = await getEvents(userId);
      const existingKeys = new Set(
        existing.map((e) => `${e.title.toLowerCase()}|${e.startDate.toMillis()}`),
      );

      let imported = 0;
      for (const e of gEvents) {
        const startRaw = e.start.dateTime ?? e.start.date;
        const endRaw   = e.end.dateTime   ?? e.end.date;
        if (!startRaw || !endRaw) continue;
        const allDay = !e.start.dateTime;
        const startDate = new Date(startRaw);
        const endDate   = new Date(endRaw);
        const title = e.summary ?? 'Untitled';

        const key = `${title.toLowerCase()}|${startDate.getTime()}`;
        if (existingKeys.has(key)) continue; // skip duplicates

        await createEvent({
          userId,
          title,
          description:     (e.description ? e.description + '\n\n' : '') + `(from ${email})`,
          allDay,
          startDate:       Timestamp.fromDate(startDate),
          endDate:         Timestamp.fromDate(endDate),
          color:           e.colorId ? (GCAL_COLORS[e.colorId] ?? '#4285f4') : '#4285f4',
          category:        'google-calendar',
          location:        e.location ?? '',
          recurring:       null,
          reminderMinutes: [],
          attendees:       [],
        });
        existingKeys.add(key);
        imported++;
      }

      const next = all.map((a) =>
        a.email === email
          ? { ...a, lastSync: new Date().toISOString(), importCount: imported }
          : a,
      );
      persist(next);
      return imported;
    } finally {
      setSyncingEmail(null);
    }
  }, [userId]);

  const syncAll = useCallback(async (weeksAhead = 4): Promise<{ email: string; imported: number; error?: string }[]> => {
    const list = getStoredAccounts();
    const results: { email: string; imported: number; error?: string }[] = [];
    for (const a of list) {
      try {
        const n = await syncAccount(a.email, weeksAhead);
        results.push({ email: a.email, imported: n });
      } catch (err) {
        results.push({ email: a.email, imported: 0, error: err instanceof Error ? err.message : 'unknown error' });
      }
    }
    return results;
  }, [syncAccount]);

  // ── Realtime auto-sync ──────────────────────────────────────────────────────
  // Sync on mount (when accounts exist), on tab focus, and every 10 min while
  // the tab is visible. Silently swallows errors — UI shows lastSync timestamps.
  useEffect(() => {
    if (!userId) return;

    const SYNC_INTERVAL_MS = 10 * 60_000;
    const SYNC_WEEKS = 4;
    let lastRun = 0;

    const runIfDue = async (force = false) => {
      const list = getStoredAccounts();
      if (list.length === 0) return;
      if (!force && Date.now() - lastRun < 60_000) return; // rate-limit
      lastRun = Date.now();
      try { await syncAll(SYNC_WEEKS); } catch { /* ignore */ }
    };

    // Initial sync on mount (small delay so we don't slow first paint)
    const bootId = setTimeout(() => runIfDue(true), 1500);

    // Periodic — only ticks when tab is visible (browsers throttle anyway)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') runIfDue();
    }, SYNC_INTERVAL_MS);

    // On tab focus, sync if 1+ minute since last run
    const onVisibility = () => {
      if (document.visibilityState === 'visible') runIfDue();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(bootId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId, syncAll]);

  const pushEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, email?: string) => {
    const list = getStoredAccounts();
    const acc = email ? list.find((a) => a.email === email) : list[0];
    if (!acc) throw new Error('No Google account connected.');
    if (Date.now() > acc.expiry) throw new Error(`Session expired for ${acc.email}. Reconnect to push events.`);
    return pushEventToGoogle(acc.token, event);
  }, []);

  // Push a locally-created event to every connected Google account.
  // Failures are swallowed individually so one bad account doesn't block the rest.
  const pushToAll = useCallback(async (event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const list = getStoredAccounts();
    const valid = list.filter((a) => Date.now() < a.expiry);
    if (valid.length === 0) return;
    await Promise.allSettled(valid.map((a) => pushEventToGoogle(a.token, event)));
  }, []);

  return {
    accounts,
    syncingEmail,
    clientId,
    addAccount,
    removeAccount,
    syncAccount,
    syncAll,
    pushEvent,
    pushToAll,
  };
}
