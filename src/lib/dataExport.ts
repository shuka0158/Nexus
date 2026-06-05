// Full user data export — events, todos, notes, habits, goals, settings.
// JSON for archival/migration, ICS for calendar interoperability.

import {
  getEvents, getTodos, getNotes, getHabits, getGoals, getUserSettings, getUserProfile,
} from './firestore';
import type { CalendarEvent } from '@/types';

interface ExportBundle {
  exportedAt: string;
  format: 'nexus.v1';
  profile: unknown;
  settings: unknown;
  counts: Record<string, number>;
  events: unknown[];
  todos: unknown[];
  notes: unknown[];
  habits: unknown[];
  goals: unknown[];
}

// Convert Firestore Timestamps to ISO strings recursively so the export is portable JSON
function normalize(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(normalize);
  const o = value as Record<string, unknown>;
  // Firestore Timestamp duck-type
  if (typeof (o as { toDate?: () => Date }).toDate === 'function') {
    return ((o as { toDate: () => Date }).toDate()).toISOString();
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) out[k] = normalize(o[k]);
  return out;
}

export async function exportAllData(uid: string): Promise<ExportBundle> {
  const [profile, settings, events, todos, notes, habits, goals] = await Promise.all([
    getUserProfile(uid),
    getUserSettings(uid),
    getEvents(uid),
    getTodos(uid),
    getNotes(uid),
    getHabits(uid),
    getGoals(uid),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    format: 'nexus.v1',
    profile: normalize(profile),
    settings: normalize(settings),
    counts: {
      events: events.length,
      todos: todos.length,
      notes: notes.length,
      habits: habits.length,
      goals: goals.length,
    },
    events: normalize(events) as unknown[],
    todos: normalize(todos) as unknown[],
    notes: normalize(notes) as unknown[],
    habits: normalize(habits) as unknown[],
    goals: normalize(goals) as unknown[],
  };
}

// ─── ICS calendar export ──────────────────────────────────────────────────────

const escapeICS = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

const dtFormat = (d: Date, allDay: boolean): string => {
  if (allDay) {
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
};

export function eventsToICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEXUS//Productivity OS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const e of events) {
    const start = e.startDate.toDate();
    const end = e.endDate.toDate();
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@nexus-future.web.app`);
    lines.push(`DTSTAMP:${dtFormat(new Date(), false)}`);
    lines.push(`DTSTART${e.allDay ? ';VALUE=DATE' : ''}:${dtFormat(start, e.allDay)}`);
    lines.push(`DTEND${e.allDay ? ';VALUE=DATE' : ''}:${dtFormat(end, e.allDay)}`);
    lines.push(`SUMMARY:${escapeICS(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeICS(e.description)}`);
    if (e.location)    lines.push(`LOCATION:${escapeICS(e.location)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ─── Browser download helper ──────────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
