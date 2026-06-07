// Calendar invite parsing: ICS (free, deterministic) + free-form text via Gemini.

import { geminiChat, geminiAvailable } from './gemini';

export interface ParsedInvite {
  title: string;
  startDate: string;       // ISO
  endDate: string;         // ISO
  allDay: boolean;
  location: string | null;
  description: string | null;
}

// ─── ICS parser ───────────────────────────────────────────────────────────────

const unescapeICS = (s: string): string =>
  s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');

// ICS allows multi-line values via folded lines (CRLF + space/tab). Unfold first.
const unfold = (raw: string): string => raw.replace(/\r?\n[ \t]/g, '');

const parseIcsDate = (val: string): { date: Date; allDay: boolean } => {
  // VALUE=DATE form (YYYYMMDD) → all-day
  if (/^\d{8}$/.test(val)) {
    const y = +val.slice(0, 4), m = +val.slice(4, 6) - 1, d = +val.slice(6, 8);
    return { date: new Date(Date.UTC(y, m, d)), allDay: true };
  }
  // YYYYMMDDTHHMMSS[Z]
  const m = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) throw new Error(`Bad ICS date: ${val}`);
  const [, Y, Mo, D, H, Mi, S, Z] = m;
  if (Z) {
    return { date: new Date(Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S)), allDay: false };
  }
  return { date: new Date(+Y, +Mo - 1, +D, +H, +Mi, +S), allDay: false };
};

const extractValue = (line: string): { params: string; value: string } => {
  const colon = line.indexOf(':');
  if (colon === -1) return { params: '', value: '' };
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = left.indexOf(';');
  if (semi === -1) return { params: '', value };
  return { params: left.slice(semi + 1), value };
};

export function parseICS(raw: string): ParsedInvite[] {
  const text = unfold(raw);
  const lines = text.split(/\r?\n/);
  const out: ParsedInvite[] = [];

  let inEvent = false;
  let cur: Partial<ParsedInvite> = {};
  let curAllDay = false;

  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') { inEvent = true; cur = {}; curAllDay = false; continue; }
    if (ln === 'END:VEVENT') {
      if (cur.title && cur.startDate && cur.endDate) {
        out.push({
          title: cur.title,
          startDate: cur.startDate,
          endDate: cur.endDate,
          allDay: curAllDay,
          location: cur.location ?? null,
          description: cur.description ?? null,
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    if (ln.startsWith('SUMMARY')) {
      cur.title = unescapeICS(extractValue(ln).value);
    } else if (ln.startsWith('DESCRIPTION')) {
      cur.description = unescapeICS(extractValue(ln).value);
    } else if (ln.startsWith('LOCATION')) {
      cur.location = unescapeICS(extractValue(ln).value);
    } else if (ln.startsWith('DTSTART')) {
      const { value } = extractValue(ln);
      const { date, allDay } = parseIcsDate(value);
      cur.startDate = date.toISOString();
      curAllDay = curAllDay || allDay;
    } else if (ln.startsWith('DTEND')) {
      const { value } = extractValue(ln);
      const { date, allDay } = parseIcsDate(value);
      cur.endDate = date.toISOString();
      curAllDay = curAllDay || allDay;
    }
  }

  return out;
}

// ─── Free-form text parser via Gemini ─────────────────────────────────────────

const INVITE_SYSTEM = `You extract meeting/event details from raw text — emails, chat messages, screenshots-pasted-as-text — anything human.

Output STRICT JSON in this exact shape:
{
  "title": "short event name (5-50 chars)",
  "startDate": "ISO 8601 with timezone",
  "endDate": "ISO 8601 with timezone",
  "allDay": false,
  "location": "address, room, URL, or null",
  "description": "extra context (agenda, attendees, dial-in) or null"
}

Rules:
- If only a start time is given, infer endDate as +1 hour.
- If text says "all day", set allDay:true and use the date at 00:00 / 23:59 local.
- Preserve the timezone explicitly mentioned in the text; otherwise assume the user's local time.
- Pull video-call URLs (Zoom, Meet, Teams) into location.
- Strip greetings, signatures, and footers from description.
- If you can't find a date or time, return { "error": "no date/time found" } instead.`;

export async function parseInviteWithAI(text: string): Promise<ParsedInvite> {
  if (!geminiAvailable()) {
    throw new Error('Free-form invite parsing needs the Gemini API key. Add it in Settings → Integrations.');
  }
  const now = new Date();
  const json = await geminiChat(
    `Today is ${now.toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone}).\n\nText:\n${text}`,
    { systemInstruction: INVITE_SYSTEM, json: true, temperature: 0.2 },
  );
  const parsed = JSON.parse(json) as Partial<ParsedInvite> & { error?: string };
  if (parsed.error) throw new Error(parsed.error);
  if (!parsed.title || !parsed.startDate || !parsed.endDate) {
    throw new Error('AI could not extract a complete event.');
  }
  return {
    title: parsed.title,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    allDay: !!parsed.allDay,
    location: parsed.location ?? null,
    description: parsed.description ?? null,
  };
}

// ─── Combined entry point — auto-detects ICS vs free-form ────────────────────

export async function parseInvite(input: string): Promise<ParsedInvite[]> {
  const trimmed = input.trim();
  if (trimmed.startsWith('BEGIN:VCALENDAR')) {
    const events = parseICS(trimmed);
    if (events.length === 0) throw new Error('No VEVENT blocks found in ICS.');
    return events;
  }
  return [await parseInviteWithAI(trimmed)];
}
