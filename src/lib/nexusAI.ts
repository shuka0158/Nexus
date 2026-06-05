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
  deletedEventIds?: string[];
  // Multi-item "brain dump": when the user types several things at once,
  // each gets its own response. batch is set on the outer envelope and the
  // outer action is 'reply' with a summary message.
  batch?: AIResponse[];
}

// ─── Regex banks ──────────────────────────────────────────────────────────────

const QUERY_RX = /\b(what('s| is| do i have| are my)|do i have|show me|list|any(thing)?)\b.*\b(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|schedule|calendar|events?|meetings?|appointments?|tasks?|todos?)\b/i;
const DELETE_RX = /\b(delete|cancel|remove|drop|clear)\b/i;
const LOOKUP_RX = /\b(when\s+is|when'?s|what\s+time\s+is|what\s+time'?s|where\s+is|where'?s)\b/i;
const QUESTION_RX = /^(when|what|where|who|how|is|are|do|does|can|could|will|would|shall|should|may)\b/i;
const DUPLICATE_RX = /\b(duplicates?|dupes?|copies|copy)\b/i;
const ALL_RX = /\b(all|every|each|both|entire)\b/i;
const TASK_QUERY_RX = /\b(tasks?|todos?|to.?dos?)\b/i;

const EVENT_RX = /\b(meeting|meet|appointment|appt|standup|stand-up|call|conference|interview|session|class|event|workshop|lunch|dinner|breakfast|brunch|party|ceremony|presentation|webinar|seminar|training|demo|review|sync|catch.?up|hangout|gathering|online|zoom|teams|skype|go to|going to|visit)\b/i;

const TODO_RX = /\b(todo|task|don'?t forget|pick up|buy|email|send|finish|complete|submit|prepare|check|update|write|read|research|fix|plan|book|order|pay)\b/i;

const CREATE_INTENT_RX = /\b(create|add|schedule|set up|book|make|plan|new)\b/i;

const PRIORITY_RX: [RegExp, 'low' | 'medium' | 'high' | 'critical'][] = [
  [/\b(urgent|asap|immediately|critical)\b/i, 'critical'],
  [/\b(important|high.?priority)\b/i, 'high'],
  [/\b(low.?priority|later|whenever|someday)\b/i, 'low'],
];

// Words to strip from a name-hint before matching against event titles
const STRIP_FROM_NAME_RX = /\b(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|scheduled?|happening|on|at|the|my|a|an|any|all|every|each|both|event|events|meeting|meetings|appointment|appointments|task|tasks|todo|todos)\b/gi;

// Question-opener phrases to strip from name hints
const STRIP_QUESTION_OPENERS_RX = /^(what\s+about|what\s+is|what'?s|when\s+is|when'?s|what\s+time\s+is|what\s+time'?s|where\s+is|where'?s|is\s+there|do\s+i\s+have|tell\s+me\s+about|how\s+about)\s+/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectPriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
  for (const [rx, p] of PRIORITY_RX) if (rx.test(text)) return p;
  return 'medium';
}

// Extract and remove reminder instruction from raw text, return timing in minutes
function extractReminder(text: string): { cleaned: string; reminderMinutes: number[]; intentTodo: boolean } {
  // "remind me exactly at the time [of event]" / "remind me at the time of event"
  const atTimeRx = /\.?\s*\(?remind\s+me\s+(?:exactly\s+)?at\s+the\s+(?:time|start|beginning)(?:\s+of\s+(?:the\s+)?event)?\)?\.?/i;
  if (atTimeRx.test(text)) {
    return { cleaned: text.replace(atTimeRx, ' ').trim(), reminderMinutes: [0], intentTodo: false };
  }

  // "remind me X hours before"
  const hoursRx = /\.?\s*\(?remind\s+me\s+(\d+(?:\.\d+)?)\s+hours?\s+before\)?\.?/i;
  const hoursM = text.match(hoursRx);
  if (hoursM) {
    return { cleaned: text.replace(hoursRx, ' ').trim(), reminderMinutes: [Math.round(parseFloat(hoursM[1]) * 60)], intentTodo: false };
  }

  // "remind me half an hour before"
  const halfRx = /\.?\s*\(?remind\s+me\s+half\s+an?\s+hour\s+before\)?\.?/i;
  if (halfRx.test(text)) {
    return { cleaned: text.replace(halfRx, ' ').trim(), reminderMinutes: [30], intentTodo: false };
  }

  // "remind me X minutes before"
  const minsRx = /\.?\s*\(?remind\s+me\s+(\d+)\s+min(?:ute)?s?\s+before\)?\.?/i;
  const minsM = text.match(minsRx);
  if (minsM) {
    return { cleaned: text.replace(minsRx, ' ').trim(), reminderMinutes: [parseInt(minsM[1])], intentTodo: false };
  }

  // "remind me to <verb> <task>" → task creation, strip ONLY the prefix.
  // intentTodo=true forces routing to todo even if a word like "review" is in EVENT_RX.
  const taskRemindRx = /^\.?\s*remind\s+me\s+to\s+/i;
  if (taskRemindRx.test(text)) {
    return { cleaned: text.replace(taskRemindRx, '').trim(), reminderMinutes: [0], intentTodo: true };
  }

  // Generic "remind me [timing modifier]" — strip it, fire at event time.
  const genericRx = /\.?\s*\(?remind\s+me\b(?!\s+to\s)[^.!?()\n]{0,80}\)?\.?/i;
  if (genericRx.test(text)) {
    return { cleaned: text.replace(genericRx, ' ').trim(), reminderMinutes: [0], intentTodo: false };
  }

  return { cleaned: text, reminderMinutes: [0], intentTodo: false };
}

function cleanTitle(raw: string, dateText: string): string {
  let s = raw;
  if (dateText) s = s.replace(dateText, ' ');
  s = s.replace(/\([^)]*\)/g, ' ');
  // Loop until no more leading filler/article can be stripped
  const fillerRx   = /^(i need to|i have to|i've got to|i got to|i want to|i should|i must|i will|i have|i've got|i got|there's|there is|this is|don'?t forget to?|please add|please|can you|could you|would you|add|schedule|set up|create|make|plan|book|note|noting)\s+/i;
  const articleRx  = /^(a|an|the|my|our|on|at|in|with|to)\s+/i;
  let changed = true;
  while (changed) {
    changed = false;
    const next1 = s.replace(fillerRx, '');
    if (next1 !== s) { s = next1; changed = true; }
    const next2 = s.replace(articleRx, '');
    if (next2 !== s) { s = next2; changed = true; }
  }
  s = s.replace(/\s+(on|at|in|this|next|by|before|for|the)\s*$/i, '');
  s = s.replace(/\s*[.,;?!]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

function extractLocation(raw: string, dateText: string): string | null {
  const s = raw.replace(dateText, ' ');
  // Allow lowercase first char too (places like "the office", "downtown")
  const m = s.match(/\bat\s+((?:the\s+)?[a-zA-Z][a-zA-Z\s&'-]{2,40}?)(?=\s*[,.]|\s*$)/);
  if (m) {
    const candidate = m[1].trim();
    if (!/\b(noon|midnight|morning|afternoon|evening|night|o'clock|am|pm|\d)\b/i.test(candidate)) {
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

// Deduplicate events by title (case-insensitive) + startDate millis
function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.title.toLowerCase()}|${e.startDate.toMillis()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Parse a time scope ("today", "tomorrow", a day name) from raw input
function parseScope(raw: string): { start: Date; end: Date; label: string } | null {
  const now = new Date();
  if (/\btoday\b/i.test(raw)) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'today' };
  }
  if (/\btomorrow\b/i.test(raw)) {
    const start = new Date(now); start.setDate(now.getDate() + 1); start.setHours(0, 0, 0, 0);
    const end   = new Date(start); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'tomorrow' };
  }
  if (/\bnext week\b/i.test(raw)) {
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 8); mon.setHours(0, 0, 0, 0);
    const end = new Date(mon); end.setDate(mon.getDate() + 6); end.setHours(23, 59, 59, 999);
    return { start: mon, end, label: 'next week' };
  }
  if (/\bthis week\b/i.test(raw)) {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    return { start, end, label: 'this week' };
  }
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = raw.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dayMatch) {
    const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase());
    const diff = (targetDay - now.getDay() + 7) % 7 || 7;
    const start = new Date(now); start.setDate(now.getDate() + diff); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setHours(23, 59, 59, 999);
    return { start, end, label: dayMatch[1].toLowerCase() };
  }
  return null;
}

// Extract a name hint from a raw query: strip openers, scope words, and punctuation
function extractNameHint(raw: string, extraStripRx?: RegExp): string {
  let s = raw.replace(STRIP_QUESTION_OPENERS_RX, ' ');
  if (extraStripRx) s = s.replace(extraStripRx, ' ');
  s = s.replace(STRIP_FROM_NAME_RX, ' ');
  s = s.replace(/[?!.,'"]/g, ' ');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

// Match events against a name hint (substring or word match)
function matchByName(events: CalendarEvent[], nameHint: string): CalendarEvent[] {
  if (!nameHint) return events;
  const hintLower = nameHint.toLowerCase();
  const hintWords = hintLower.split(/\s+/).filter((w) => w.length > 2);
  return events.filter((e) => {
    const title = e.title.toLowerCase();
    return title.includes(hintLower) || hintWords.some((w) => title.includes(w));
  });
}

// ─── Core parser ──────────────────────────────────────────────────────────────

export function parseUserInput(input: string): AIResponse {
  const raw = input.trim();
  const now = new Date();

  const { cleaned: text, reminderMinutes, intentTodo } = extractReminder(raw);

  const parsed = chrono.parse(text, now, { forwardDate: true });
  const hasDate = parsed.length > 0;
  const dr = parsed[0];
  const dateText = dr?.text ?? '';

  const hasEventKw = EVENT_RX.test(text);
  const hasTodoKw  = TODO_RX.test(text);

  // Question-shaped input without explicit creation keywords → don't create anything
  if (QUESTION_RX.test(text) && !hasEventKw && !hasTodoKw && !CREATE_INTENT_RX.test(text)) {
    return {
      action: 'reply',
      message: "I can look up events by name, check your schedule, create events, or add tasks. What would you like?",
    };
  }

  if (!hasDate && !hasEventKw && !hasTodoKw && !CREATE_INTENT_RX.test(text)) {
    return {
      action: 'reply',
      message: "I can create events and tasks from natural language. Try: \"Team meeting on Friday at 3pm\" or \"Remind me to send the report by tomorrow\".",
    };
  }

  const title = cleanTitle(text, dateText) || (hasEventKw ? 'New Event' : 'New Task');

  // ── Create event ────────────────────────────────────────────────────────────
  // intentTodo (from "remind me to X") forces todo path
  const isEvent = !intentTodo && (hasEventKw || (hasDate && !hasTodoKw));
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

// ─── Brain dump (multi-item) ──────────────────────────────────────────────────

// Strong action-verb starters that indicate a fresh item after a comma
const ACTION_VERB_RX = /^\s*(buy|email|send|finish|complete|submit|prepare|check|update|write|read|research|fix|plan|book|order|pay|pick\s+up|call|meet|meeting|lunch|dinner|breakfast|brunch|review|sync|interview|appointment|appt|standup|workout|gym|don'?t\s+forget|remind\s+me)/i;

function splitBrainDump(input: string): string[] {
  // Split on sentence terminators first
  const sentences = input.split(/[.;\n]+/).map((s) => s.trim()).filter(Boolean);
  const result: string[] = [];

  for (const sentence of sentences) {
    const subparts = sentence.split(/,\s+/);
    if (subparts.length === 1) {
      result.push(sentence);
      continue;
    }
    // Split on comma only when the next fragment starts with an action verb
    let buffer = subparts[0];
    for (let i = 1; i < subparts.length; i++) {
      if (ACTION_VERB_RX.test(subparts[i])) {
        result.push(buffer);
        buffer = subparts[i];
      } else {
        buffer += ', ' + subparts[i];
      }
    }
    result.push(buffer);
  }

  return result.map((s) => s.trim()).filter(Boolean);
}

function tryBrainDump(input: string, events: CalendarEvent[], todos: Todo[]): AIResponse | null {
  const fragments = splitBrainDump(input);
  if (fragments.length < 2) return null;

  const items: AIResponse[] = [];
  // Track within-batch titles too, so "buy milk. buy milk." doesn't create two
  const seenTitles = new Set<string>();

  for (const frag of fragments) {
    const r = parseUserInput(frag);
    if (r.action !== 'create_event' && r.action !== 'create_todo') continue;

    // Dedupe events against existing calendar (same title + start within 1min)
    if (r.action === 'create_event' && r.event) {
      const newTitle = r.event.title.toLowerCase();
      const newMs = new Date(r.event.startDate).getTime();
      const key = `event|${newTitle}|${newMs}`;
      if (seenTitles.has(key)) continue;
      const dup = events.find((e) =>
        e.title.toLowerCase() === newTitle &&
        Math.abs(e.startDate.toMillis() - newMs) < 60_000,
      );
      if (dup) continue;
      seenTitles.add(key);
    }

    // Dedupe todos against existing open tasks AND within-batch (same title)
    if (r.action === 'create_todo' && r.todo) {
      const newTitle = r.todo.title.toLowerCase();
      const key = `todo|${newTitle}`;
      if (seenTitles.has(key)) continue;
      const dup = todos.find((t) =>
        t.status !== 'done' && t.title.toLowerCase() === newTitle,
      );
      if (dup) continue;
      seenTitles.add(key);
    }
    items.push(r);
  }

  if (items.length < 2) return null;

  const eventCount = items.filter((r) => r.action === 'create_event').length;
  const todoCount  = items.filter((r) => r.action === 'create_todo').length;
  const parts = [
    eventCount && `${eventCount} event${eventCount !== 1 ? 's' : ''}`,
    todoCount && `${todoCount} task${todoCount !== 1 ? 's' : ''}`,
  ].filter(Boolean) as string[];

  return {
    action: 'reply',
    message: `Captured ${parts.join(' and ')} from your brain dump.`,
    batch: items,
  };
}

// ─── Context-aware processing ─────────────────────────────────────────────────

export function processWithContext(
  input: string,
  events: CalendarEvent[],
  todos: Todo[],
): AIResponse {
  const raw = input.trim();

  // Brain-dump: if it parses cleanly as 2+ items, return them as a batch
  const brain = tryBrainDump(raw, events, todos);
  if (brain) return brain;

  // ── Task list query (order-independent: "what tasks do i have", "my todos", etc.) ──
  const taskQueryOpener = /\b(what|what'?s|do i have|show me|list|any|are there|are my|my|all my)\b/i;
  if (TASK_QUERY_RX.test(raw) && taskQueryOpener.test(raw) && !DELETE_RX.test(raw) && !CREATE_INTENT_RX.test(raw)) {
    const open = todos.filter((t) => t.status !== 'done');
    if (open.length === 0) {
      return { action: 'query_schedule', message: 'No open tasks. You\'re all caught up.' };
    }
    const lines = open.slice(0, 12).map((t) => {
      const due = t.dueDate
        ? ` — due ${t.dueDate.toDate().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
        : '';
      return `• [${t.priority}] ${t.title}${due}`;
    });
    return {
      action: 'query_schedule',
      message: `You have ${open.length} open task${open.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}${open.length > 12 ? `\n…and ${open.length - 12} more.` : ''}`,
    };
  }

  // ── Schedule query ──────────────────────────────────────────────────────────
  if (QUERY_RX.test(raw)) {
    const scope = parseScope(raw) ?? {
      start: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0); return d; })(),
      end:   (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 7); d.setHours(23,59,59,999); return d; })(),
      label: 'this week',
    };

    const matching = dedupeEvents(events)
      .filter((e) => { const d = e.startDate.toDate(); return d >= scope.start && d <= scope.end; })
      .sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());

    if (matching.length === 0) {
      return { action: 'query_schedule', message: `You have no events scheduled for ${scope.label}.` };
    }

    const lines = matching.map((e) => {
      const d = e.startDate.toDate();
      const timeStr = e.allDay
        ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `• ${e.title} — ${timeStr}`;
    });

    return {
      action: 'query_schedule',
      message: `Here's what you have for ${scope.label}:\n\n${lines.join('\n')}`,
    };
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  if (DELETE_RX.test(raw)) {
    const isAll       = ALL_RX.test(raw);
    const isDuplicate = DUPLICATE_RX.test(raw);
    const scope       = parseScope(raw);

    // Bulk duplicate cleanup
    if (isDuplicate) {
      let pool = events;
      if (scope) pool = pool.filter((e) => { const d = e.startDate.toDate(); return d >= scope.start && d <= scope.end; });

      const groups = new Map<string, CalendarEvent[]>();
      pool.forEach((e) => {
        const key = `${e.title.toLowerCase()}|${e.startDate.toMillis()}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(e);
      });

      const toDelete: string[] = [];
      for (const group of groups.values()) {
        if (group.length > 1) toDelete.push(...group.slice(1).map((e) => e.id));
      }

      if (toDelete.length === 0) {
        return { action: 'reply', message: scope ? `No duplicate events found for ${scope.label}.` : 'No duplicate events found.' };
      }
      return {
        action: 'delete_event',
        message: `Removed ${toDelete.length} duplicate event${toDelete.length === 1 ? '' : 's'}${scope ? ` from ${scope.label}` : ''}.`,
        deletedEventIds: toDelete,
      };
    }

    // Build name hint
    const nameHint = raw
      .replace(DELETE_RX, ' ')
      .replace(STRIP_FROM_NAME_RX, ' ')
      .replace(DUPLICATE_RX, ' ')
      .replace(/[?!.,'"]/g, ' ')
      .replace(/\s{2,}/g, ' ').trim();

    if (!nameHint && !scope) {
      return { action: 'reply', message: 'Which event would you like to delete? Try: "Delete team meeting", "Delete all events tomorrow", or "Delete duplicates".' };
    }

    let matches: CalendarEvent[] = events;
    if (nameHint) matches = matchByName(matches, nameHint);
    if (scope) {
      matches = matches.filter((e) => {
        const d = e.startDate.toDate();
        return d >= scope.start && d <= scope.end;
      });
    }

    if (matches.length === 0) {
      const what = nameHint || (scope ? scope.label : 'that');
      return { action: 'reply', message: `I couldn't find any matching event for "${what}".` };
    }

    // Single match → delete it
    if (matches.length === 1) {
      return {
        action: 'delete_event',
        message: `Deleted "${matches[0].title}" from your calendar.`,
        deletedEventIds: [matches[0].id],
      };
    }

    // Multiple matches share the exact same title+time → safe to delete all (they're literal duplicates)
    const uniqueKeys = new Set(matches.map((m) => `${m.title.toLowerCase()}|${m.startDate.toMillis()}`));
    if (uniqueKeys.size === 1) {
      return {
        action: 'delete_event',
        message: `Removed "${matches[0].title}" (${matches.length} duplicate copies) from your calendar.`,
        deletedEventIds: matches.map((m) => m.id),
      };
    }

    // "all" specified → delete every match
    if (isAll) {
      return {
        action: 'delete_event',
        message: `Deleted ${matches.length} event${matches.length === 1 ? '' : 's'}${scope ? ` on ${scope.label}` : ''}.`,
        deletedEventIds: matches.map((m) => m.id),
      };
    }

    // Multiple distinct events → list and ask user to specify
    const sorted = [...matches].sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());
    const preview = sorted.slice(0, 5).map((e) => {
      const d = e.startDate.toDate();
      const t = e.allDay
        ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `• ${e.title} — ${t}`;
    }).join('\n');
    return {
      action: 'reply',
      message: `${matches.length} events match. Add a date ("delete X today") or say "delete all X" to remove them all:\n\n${preview}${matches.length > 5 ? `\n…and ${matches.length - 5} more.` : ''}`,
    };
  }

  // ── Event lookup ("when is X?", "what time is X?", "where is X?") ──────────
  const isLookupExplicit = LOOKUP_RX.test(raw);
  const isQuestion       = QUESTION_RX.test(raw);
  const hasCreationIntent = (EVENT_RX.test(raw) || TODO_RX.test(raw)) && CREATE_INTENT_RX.test(raw);

  if (isLookupExplicit || (isQuestion && !hasCreationIntent)) {
    const scope = parseScope(raw);
    const nameHint = extractNameHint(raw);

    if (nameHint.length > 1) {
      let matches = dedupeEvents(events);
      matches = matchByName(matches, nameHint);
      matches.sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());

      if (scope) {
        matches = matches.filter((e) => {
          const d = e.startDate.toDate();
          return d >= scope.start && d <= scope.end;
        });
      }

      if (matches.length === 0) {
        const notFound = scope
          ? `No "${nameHint}" event found for ${scope.label}.`
          : `I couldn't find any event matching "${nameHint}" in your calendar.`;
        return { action: 'query_schedule', message: notFound };
      }

      // Cap to keep responses readable
      const capped = matches.slice(0, 10);
      const lines = capped.map((e) => {
        const d = e.startDate.toDate();
        const timeStr = e.allDay
          ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
          : d.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return matches.length === 1
          ? `"${e.title}" is on ${timeStr}.`
          : `• ${e.title} — ${timeStr}`;
      });

      const suffix = matches.length > capped.length ? `\n…and ${matches.length - capped.length} more.` : '';
      return {
        action: 'query_schedule',
        message: matches.length === 1
          ? lines[0]
          : `Found ${matches.length} matching event${matches.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}${suffix}`,
      };
    }

    // Question-shaped but no recognisable name
    return {
      action: 'reply',
      message: "I can look up events by name, check your schedule, create events, or add tasks. What would you like?",
    };
  }

  // ── Fall back to creation parser ────────────────────────────────────────────
  const response = parseUserInput(input);

  // Prevent duplicate event creation
  if (response.action === 'create_event' && response.event) {
    const newTitleLower = response.event.title.toLowerCase();
    const newStartMs = new Date(response.event.startDate).getTime();
    const duplicate = events.find((e) =>
      e.title.toLowerCase() === newTitleLower &&
      Math.abs(e.startDate.toMillis() - newStartMs) < 60_000,
    );
    if (duplicate) {
      return {
        action: 'reply',
        message: `"${response.event.title}" already exists at that time. Skipped to avoid a duplicate.`,
      };
    }
  }

  return response;
}

// ─── Firestore executor ───────────────────────────────────────────────────────

export async function executeAIResponse(
  response: AIResponse,
  userId: string,
): Promise<{ id: string; type: 'event' | 'todo' } | null> {
  if (response.action === 'delete_event' && response.deletedEventIds?.length) {
    await Promise.all(response.deletedEventIds.map((id) => deleteEvent(id)));
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
