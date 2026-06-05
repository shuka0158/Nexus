// Thin wrapper around the Gemini REST API.
// Free tier: 15 req/min, 1500 req/day on gemini-2.0-flash. No payment required —
// users sign up at https://aistudio.google.com/app/apikey to get a key.

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const geminiAvailable = (): boolean =>
  !!process.env.NEXT_PUBLIC_GEMINI_API_KEY;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { code: number; message: string };
}

interface GeminiOptions {
  systemInstruction?: string;
  json?: boolean;       // request strict JSON output
  temperature?: number;
}

export async function geminiChat(prompt: string, opts: GeminiOptions = {}): Promise<string> {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured. Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local');

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

// ─── Task breakdown ───────────────────────────────────────────────────────────

export interface BreakdownStep {
  title: string;
  estimatedMinutes?: number;
}

const BREAKDOWN_SYSTEM = `You break complex tasks into a sequence of small, concrete, actionable subtasks for someone with executive-function challenges (ADHD).

Rules:
- 3 to 7 subtasks. No more.
- Each subtask should take 5–30 minutes.
- Start with the easiest physical action (open a doc, find a file, write a draft outline) to lower activation cost.
- Use plain language, present tense, no fluff.
- Output STRICT JSON: { "steps": [{ "title": "...", "estimatedMinutes": N }, ...] }
`;

export async function breakdownTask(taskTitle: string): Promise<BreakdownStep[]> {
  const text = await geminiChat(`Task: ${taskTitle}`, {
    systemInstruction: BREAKDOWN_SYSTEM,
    json: true,
    temperature: 0.5,
  });
  try {
    const parsed = JSON.parse(text) as { steps?: BreakdownStep[] };
    if (!Array.isArray(parsed.steps)) throw new Error('Malformed steps');
    return parsed.steps
      .filter((s) => typeof s.title === 'string' && s.title.trim())
      .slice(0, 7);
  } catch (err) {
    throw new Error('Could not parse breakdown from AI: ' + (err instanceof Error ? err.message : 'unknown'));
  }
}

// ─── Smart suggestion: "what should I focus on?" ─────────────────────────────

export async function suggestFocus(snapshot: {
  openTodoTitles: string[];
  todayEventTitles: string[];
  currentTimeIso: string;
}): Promise<string> {
  const prompt = JSON.stringify(snapshot, null, 2);
  return geminiChat(prompt, {
    systemInstruction: `You are a focus coach for someone with ADHD. Given their open tasks and today's events as JSON, write ONE short paragraph (max 60 words) recommending what to work on right now and why. No lists, no bullets, no formatting markup. Conversational tone, not corporate.`,
    temperature: 0.7,
  });
}
