import * as chrono from 'chrono-node';
import { Timestamp } from 'firebase/firestore';
import { createEvent, createTodo, deleteEvent } from './firestore';
import type { CalendarEvent, Todo } from '@/types';

export type AIAction = 'create_event' | 'create_todo' | 'delete_event' | 'query_schedule' | 'reply';

export interface AIEventData {
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  reminderMinutes: number[];
}

export interface AITodoData {
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string | null;
}

export interface AIResponse {
  action: AIAction;
  message: string;
  event?: AIEventData;
  todo?: AITodoData;
  deletedEventId?: string;
}

// ─── Schedule query helpers ───────────────────────────────────────────────────

const QUERY_RX = /\b(what('s| is| do i have| are my)|do i have|show me|list|any(thing)?)\b.*\b(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|schedule|calendar|events?|meetings?|appointments?)\b/i;
const DELETE_RX = /\b(delete|cancel|remove|drop)\b/i;

// ─── Keyword banks ────────────────────────────────────────────────────────────

const EVENT_RX = /\b(meeting|meet|appointment|appt|standup|stand-up|call|conference|interview|session|class|event|workshop|lunch|dinner|breakfast|brunch|party|ceremony|presentation|webinar|seminar|training|demo|review|sync|catch.?up|hangout|gathering|online|zoom|teams|skype|go to|going to|visit)\b/i;

const TODO_RX = /\b(todo|task|don't forget|dont forget|pick up|buy|email|send|finish|complete|submit|prepare|check|update|write|read|research|fix|plan|book|order|pay)\b/i;

const PRIORITY_RX: [RegExp, 'low' | 'medium' | 'high' | 'critical'][] = [
  [/\b(urgent|asap|immediately|critical)\b/i, 'critical'],
  [/\b(important|high.?priority)\b/i, 'high'],
  [/\b(low.?priority|later|whenever|someday)\b/i, 'low'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectPriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
  for (const [rx, p] of PRIORITY_RX) if (rx.test(text)) return p;
  return 'medium';
}

// Extract and remove reminder instruction from raw text, return timing in minutes
function extractReminder(text: string): { cleaned: string; reminderMinutes: number[] } {
  // Patterns ordered from most specific to least specific

  // "remind me exactly at the time [of event]" / "remind me at the time of event"
  const atTimeRx = /\.?\s*\(?remind\s+me\s+(?:exactly\s+)?at\s+the\s+(?:time|start|beginning)(?:\s+of\s+(?:the\s+)?event)?\)?\.?/i;
  if (atTimeRx.test(text)) {
    return { cleaned: text.replace(atTimeRx, ' ').trim(), reminderMinutes: [0] };
  }

  // "remind me X hours before"
  const hoursRx = /\.?\s*\(?remind\s+me\s+(\d+(?:\.\d+)?)\s+hours?\s+before\)?\.?/i;
  const hoursM = text.match(hoursRx);
  if (hoursM) {
    return { cleaned: text.replace(hoursRx, ' ').trim(), reminderMinutes: [Math.round(parseFloat(hoursM[1]) * 60)] };
  }

  // "remind me half an hour before"
  const halfRx = /\.?\s*\(?remind\s+me\s+half\s+an?\s+hour\s+before\)?\.?/i;
  if (halfRx.test(text)) {
    return { cleaned: text.replace(halfRx, ' ').trim(), reminderMinutes: [30] };
  }

  // "remind me X minutes before"
  const minsRx = /\.?\s*\(?remind\s+me\s+(\d+)\s+min(?:ute)?s?\s+before\)?\.?/i;
  const minsM = text.match(minsRx);
  if (minsM) {
    return { cleaned: text.replace(minsRx, ' ').trim(), reminderMinutes: [parseInt(minsM[1])] };
  }

  // Generic "remind me [anything]" — strip it, fire at event time
  const genericRx = /\.?\s*\(?remind\s+me\b[^.!?()\n]{0,80}\)?\.?/i;
  if (genericRx.test(text)) {
    return { cleaned: text.replace(genericRx, ' ').trim(), reminderMinutes: [0] };
  }

  return { cleaned: text, reminderMinutes: [0] };
}

function cleanTitle(raw: string, dateText: string): string {
  let s = raw;
  // Remove parsed date fragment
  if (dateText) s = s.replace(dateText, ' ');
  // Strip parenthetical content entirely
  s = s.replace(/\([^)]*\)/g, ' ');
  // Strip leading filler phrases (longest first)
  s = s.replace(/^(i need to|i have to|i've got to|i got to|i want to|i should|i must|i will|i have|i've got|i got|there's|there is|this is|don't forget to?|please add|add|schedule|set up|create|plan|note|noting)\s+/i, '');
  // Strip trailing orphan prepositions
  s = s.replace(/\s+(on|at|in|this|next|by|before|for|the)\s*$/i, '');
  // Strip leading articles / prepositions
  s = s.replace(/^(a|an|the|my|our|on|at|in|with)\s+/i, '');
  // Collapse whitespace and punctuation artefacts
  s = s.replace(/\s*[.,;]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

function extractLocation(raw: string, dateText: string): string | null {
  const s = raw.replace(dateText, ' ');
  const m = s.match(/\bat\s+([A-Z][a-zA-Z\s&'-]{2,40}?)(?=\s*[,.]|\s*$)/);
  if (m) {
    const candidate = m[1].trim();
    if (!/\b(noon|midnight|morning|afternoon|evening|night|o'clock|am|pm)\b/i.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// ─── Core parser ──────────────────────────────────────────────────────────────

export function parseUserInput(input: string): AIResponse {
  const raw = input.trim();
  const now = new Date();

  // Step 1: extract & strip any reminder instruction from the raw text
  const { cleaned: text, reminderMinutes } = extractReminder(raw);

  // Step 2: parse date/time on the cleaned text
  const parsed = chrono.parse(text, now, { forwardDate: true });
  const hasDate = parsed.length > 0;
  const dr = parsed[0];
  const dateText = dr?.text ?? '';

  const hasEventKw = EVENT_RX.test(text);
  const hasTodoKw  = TODO_RX.test(text);

  // Nothing recognisable — conversational reply
  if (!hasDate && !hasEventKw && !hasTodoKw) {
    return {
      action: 'reply',
      message: "I can create events and tasks from natural language. Try: \"Team meeting on Friday at 3pm\" or \"Remind me to send the report by tomorrow\".",
    };
  }

  const title = cleanTitle(text, dateText) || (hasEventKw ? 'New Event' : 'New Task');

  // ── Create event ────────────────────────────────────────────────────────────
  const isEvent = hasEventKw || (hasDate && !hasTodoKw);
  if (isEvent) {
    const startDate = dr?.start.date() ?? now;
    const endDate   = dr?.end?.date()  ?? new Date(startDate.getTime() + 60 * 60 * 1000);
    const allDay    = !dr?.start.isCertain('hour');
    const location  = extractLocation(text, dateText);

    const reminderLabel = reminderMinutes[0] === 0
      ? 'exactly at event time'
      : reminderMinutes[0] >= 60
        ? `${reminderMinutes[0] / 60}h before`
        : `${reminderMinutes[0]} min before`;

    return {
      action: 'create_event',
      message: `Scheduled "${title}" for ${allDay ? fmtDate(startDate) : fmtDateTime(startDate)} · reminder ${reminderLabel}.`,
      event: {
        title,
        startDate: startDate.toISOString(),
        endDate:   endDate.toISOString(),
        allDay,
        location,
        description: null,
        reminderMinutes,
      },
    };
  }

  // ── Create todo ─────────────────────────────────────────────────────────────
  const dueDate = hasDate ? dr?.start.date() : null;
  const priority = detectPriority(text);

  return {
    action: 'create_todo',
    message: `Added "${title}" to your tasks${dueDate ? ` — due ${fmtDate(dueDate)}` : ''}.`,
    todo: {
      title,
      description: null,
      priority,
      dueDate: dueDate?.toISOString() ?? null,
    },
  };
}

// ─── Context-aware processing ─────────────────────────────────────────────────

export function processWithContext(
  input: string,
  events: CalendarEvent[],
  todos: Todo[],
): AIResponse {
  const raw = input.trim();

  // ── Schedule query ──────────────────────────────────────────────────────────
  if (QUERY_RX.test(raw)) {
    const now = new Date();
    let start: Date, end: Date, label: string;

    if (/\btoday\b/i.test(raw)) {
      start = new Date(now); start.setHours(0,0,0,0);
      end   = new Date(now); end.setHours(23,59,59,999);
      label = 'today';
    } else if (/\btomorrow\b/i.test(raw)) {
      start = new Date(now); start.setDate(now.getDate()+1); start.setHours(0,0,0,0);
      end   = new Date(start); end.setHours(23,59,59,999);
      label = 'tomorrow';
    } else if (/\bnext week\b/i.test(raw)) {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 8); mon.setHours(0,0,0,0);
      start = mon; end = new Date(mon); end.setDate(mon.getDate()+6); end.setHours(23,59,59,999);
      label = 'next week';
    } else {
      const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const dayMatch = raw.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
      if (dayMatch) {
        const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase());
        const diff = (targetDay - now.getDay() + 7) % 7 || 7;
        start = new Date(now); start.setDate(now.getDate()+diff); start.setHours(0,0,0,0);
        end   = new Date(start); end.setHours(23,59,59,999);
        label = dayMatch[1];
      } else {
        // Default: this week
        start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0,0,0,0);
        end   = new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
        label = 'this week';
      }
    }

    const matching = events
      .filter(e => { const d = e.startDate.toDate(); return d >= start && d <= end; })
      .sort((a,b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());

    if (matching.length === 0) {
      return { action: 'query_schedule', message: `You have no events scheduled for ${label}.` };
    }

    const lines = matching.map(e => {
      const d = e.startDate.toDate();
      const timeStr = e.allDay
        ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `• ${e.title} — ${timeStr}`;
    });

    return {
      action: 'query_schedule',
      message: `Here's what you have for ${label}:\n\n${lines.join('\n')}`,
    };
  }

  // ── Delete event ────────────────────────────────────────────────────────────
  if (DELETE_RX.test(raw)) {
    // Remove delete keyword and find the event name
    const nameHint = raw
      .replace(DELETE_RX, '')
      .replace(/\b(event|meeting|appointment|the|my)\b/gi, '')
      .replace(/['"]/g, '')
      .trim();

    if (!nameHint) {
      return { action: 'reply', message: 'Which event would you like to delete? Try: "Delete team meeting"' };
    }

    const scored = events.map(e => ({
      event: e,
      score: e.title.toLowerCase().includes(nameHint.toLowerCase()) ? 1 : 0,
    })).filter(x => x.score > 0);

    if (scored.length === 0) {
      return { action: 'reply', message: `I couldn't find an event matching "${nameHint}". Check the calendar for the exact name.` };
    }

    const target = scored[0].event;
    return {
      action: 'delete_event',
      message: `Deleted "${target.title}" from your calendar.`,
      deletedEventId: target.id,
    };
  }

  // Fall back to the regular parser
  return parseUserInput(input);
}

// ─── Firestore executor ───────────────────────────────────────────────────────

export async function executeAIResponse(
  response: AIResponse,
  userId: string,
): Promise<{ id: string; type: 'event' | 'todo' } | null> {
  if (response.action === 'delete_event' && response.deletedEventId) {
    await deleteEvent(response.deletedEventId);
    return null;
  }

  if (response.action === 'create_event' && response.event) {
    const e = response.event;
    const data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      title: e.title,
      description: e.description ?? '',
      startDate: Timestamp.fromDate(new Date(e.startDate)),
      endDate:   Timestamp.fromDate(new Date(e.endDate)),
      allDay: e.allDay,
      color: '#00d4ff',
      category: 'meeting',
      location: e.location ?? '',
      recurring: null,
      reminderMinutes: e.reminderMinutes ?? [15],
      attendees: [],
    };
    const id = await createEvent(data);
    return { id, type: 'event' };
  }

  if (response.action === 'create_todo' && response.todo) {
    const t = response.todo;
    const data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      title: t.title,
      description: t.description ?? '',
      status: 'todo',
      priority: t.priority,
      labels: [],
      dueDate:    t.dueDate ? Timestamp.fromDate(new Date(t.dueDate)) : null,
      reminderAt: null,
      subtasks: [],
      attachments: [],
      recurring: null,
      order: Date.now(),
      completedAt: null,
    };
    const id = await createTodo(data);
    return { id, type: 'todo' };
  }

  return null;
}
