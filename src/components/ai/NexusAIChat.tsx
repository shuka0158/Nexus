'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Send, Bot, User, Calendar, CheckSquare,
  ChevronDown, Loader2, Trash2, Mic, MicOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { processWithContext, executeAIResponse, AIResponse } from '@/lib/nexusAI';
import { subscribeToAllEvents, subscribeToTodos } from '@/lib/firestore';
import { CalendarEvent, Todo } from '@/types';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  aiResponse?: AIResponse;
  aiBatch?: AIResponse[];
  loading?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  'Buy milk. Email John. Meeting Friday at 3pm.',
  'What do I have this week?',
  'What\'s on my schedule today?',
  'Remind me to review the report by Thursday',
  'Delete duplicate events',
];

// ─── Created item card ────────────────────────────────────────────────────────

const CreatedItemCard = ({ response }: { response: AIResponse }) => {
  const { theme } = useTheme();

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const isEvent = response.action === 'create_event' && response.event;
  const isTodo  = response.action === 'create_todo'  && response.todo;
  if (!isEvent && !isTodo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mt-2 p-3 rounded-xl border"
      style={{
        background: `linear-gradient(135deg, ${theme.accentColor}14, ${theme.accentColor}07)`,
        borderColor: `${theme.accentColor}30`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {isEvent
          ? <Calendar    className="w-4 h-4 flex-shrink-0" style={{ color: theme.accentColor }} />
          : <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: theme.accentColor }} />}
        <span className="text-xs font-semibold" style={{ color: theme.accentColor }}>
          {isEvent ? 'Event created' : 'Task created'}
        </span>
        <span className="ml-auto text-[10px] text-white/30">✓ Saved</span>
      </div>

      {isEvent && response.event && (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-white/90">{response.event.title}</p>
          <p className="text-xs text-white/50">{fmt(response.event.startDate)}</p>
          {response.event.location && (
            <p className="text-xs text-white/40">📍 {response.event.location}</p>
          )}
          <p className="text-[10px] text-white/25 mt-1">
            {(response.event.reminderMinutes?.[0] ?? 15) === 0
              ? 'Reminder at event time'
              : `Reminder ${response.event.reminderMinutes?.[0] ?? 15} min before`}
          </p>
        </div>
      )}

      {isTodo && response.todo && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white/90">{response.todo.title}</p>
          {response.todo.dueDate && (
            <p className="text-xs text-white/50">
              Due: {new Date(response.todo.dueDate).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </p>
          )}
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-semibold inline-block uppercase tracking-wide',
            response.todo.priority === 'critical' && 'bg-red-500/20 text-red-400',
            response.todo.priority === 'high'     && 'bg-orange-500/20 text-orange-400',
            response.todo.priority === 'medium'   && 'bg-yellow-500/20 text-yellow-400',
            response.todo.priority === 'low'      && 'bg-green-500/20 text-green-400',
          )}>
            {response.todo.priority}
          </span>
        </div>
      )}
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const NexusAIChat: React.FC = () => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const [events, setEvents]   = useState<CalendarEvent[]>([]);
  const [todos, setTodos]     = useState<Todo[]>([]);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    if (!user) return;
    const unsubEvents = subscribeToAllEvents(user.uid, setEvents);
    const unsubTodos  = subscribeToTodos(user.uid, setTodos);
    return () => { unsubEvents(); unsubTodos(); };
  }, [user]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 260);
  }, [open]);

  // Voice input via Web Speech API (Chrome/Edge/Safari)
  useEffect(() => {
    const win = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setVoiceSupported(!!(win.SpeechRecognition || win.webkitSpeechRecognition));
  }, []);

  const toggleVoice = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const Ctor = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      | (new () => {
          continuous: boolean; interimResults: boolean; lang: string;
          start: () => void; stop: () => void;
          onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
          onend: (() => void) | null;
          onerror: ((e: { error: string }) => void) | null;
        })
      | undefined;
    if (!Ctor) return;

    if (listening && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      return;
    }

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setInput(transcript);
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    rec.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  // Allow other components to open the chat by dispatching a custom event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-ai-chat', handler);
    return () => window.removeEventListener('open-ai-chat', handler);
  }, []);

  // Quick-capture hotkey: "/" anywhere opens the AI chat.
  // "/" was chosen as primary because it's safe — doesn't break Space-to-scroll
  // or Space-to-activate-focused-buttons.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (open) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== '/') return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      // Don't hijack while typing or while focused on an interactive control
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (t.isContentEditable) return;
      if (t.getAttribute('role') === 'button') return;

      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMsg = useCallback((msg: Omit<ChatMessage, 'id'>): string => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  }, []);

  const patchMsg = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const send = async (text = input.trim()) => {
    if (!text || sending || !user) return;
    setInput('');
    setSending(true);
    addMsg({ role: 'user', text });
    const loadId = addMsg({ role: 'assistant', text: '', loading: true });

    try {
      // Small artificial delay so it feels "smart" rather than instant
      await new Promise((r) => setTimeout(r, 420));

      const response = processWithContext(text, events, todos);

      // Batch (brain dump): persist each item, then render one card per saved item
      if (response.batch && response.batch.length > 0) {
        const savedItems: AIResponse[] = [];
        for (const item of response.batch) {
          try {
            await executeAIResponse(item, user.uid);
            savedItems.push(item);
          } catch { /* skip failed individual items */ }
        }
        patchMsg(loadId, {
          text: response.message,
          loading: false,
          aiBatch: savedItems,
        });
      } else {
        let savedOk = false;
        const needsFirestore = response.action === 'create_event' || response.action === 'create_todo' || response.action === 'delete_event';
        if (needsFirestore) {
          try {
            await executeAIResponse(response, user.uid);
            savedOk = true;
          } catch {
            toast.error('Could not save to Firestore — check your connection.');
          }
        }

        patchMsg(loadId, {
          text: response.message,
          loading: false,
          aiResponse: (savedOk && (response.action === 'create_event' || response.action === 'create_todo')) ? response : undefined,
        });
      }
    } catch {
      patchMsg(loadId, { text: 'Something went wrong. Please try again.', loading: false, error: true });
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const panelBg     = isDark ? 'rgba(10,10,25,0.97)' : 'rgba(248,250,252,0.97)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  if (!user) return null;

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.secondaryColor})`,
          boxShadow: `0 8px 28px ${theme.accentColor}50, 0 0 0 1px ${theme.accentColor}20`,
        }}
        title="NEXUS AI · Press /"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <ChevronDown className="w-6 h-6 text-black" />
              </motion.span>
            : <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Sparkles className="w-6 h-6 text-black" />
              </motion.span>
          }
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+140px)] md:bottom-24 right-3 left-3 sm:left-auto sm:right-6 z-40 sm:w-[370px] rounded-2xl flex flex-col overflow-hidden"
            style={{
              height: 'min(520px, calc(100vh - 220px))',
              background: panelBg,
              border: `1px solid ${borderColor}`,
              backdropFilter: 'blur(24px)',
              boxShadow: isDark
                ? '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 12px 40px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${borderColor}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.secondaryColor})` }}>
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-none" style={{ color: 'var(--text-primary)' }}>NEXUS AI</p>
                <p className="text-xs text-white/40 mt-0.5">Smart assistant · No setup needed</p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all" title="Clear">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: `${theme.accentColor}18` }}>
                    <Bot className="w-6 h-6" style={{ color: theme.accentColor }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white mb-1">Hi, I&apos;m NEXUS AI</p>
                    <p className="text-xs text-white/40 leading-relaxed max-w-[260px]">
                      Describe any meeting, appointment, or task in plain words — I&apos;ll save it automatically.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => send(s)}
                        className="w-full text-left text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-white/45 hover:text-white hover:bg-white/8 transition-all">
                        &ldquo;{s}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex gap-2 items-start', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      msg.role === 'user' ? 'bg-[var(--accent)]/15' : 'bg-white/8',
                    )}>
                      {msg.role === 'user'
                        ? <User className="w-3.5 h-3.5 text-[var(--accent)]" />
                        : <Bot  className="w-3.5 h-3.5 text-white/50" />}
                    </div>

                    {/* Bubble + card */}
                    <div className={cn('max-w-[80%]', msg.role === 'user' && 'flex flex-col items-end')}>
                      <div
                        className={cn(
                          'px-3 py-2 rounded-xl text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'text-black rounded-tr-sm'
                            : cn('rounded-tl-sm', msg.error
                                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                                : 'bg-white/5 text-white/80'),
                        )}
                        style={msg.role === 'user' ? { background: theme.accentColor } : undefined}
                      >
                        {msg.loading
                          ? <span className="flex items-center gap-2 text-white/40 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" />Thinking…</span>
                          : msg.text}
                      </div>

                      {msg.aiResponse && msg.aiResponse.action !== 'reply' && !msg.loading && (
                        <CreatedItemCard response={msg.aiResponse} />
                      )}
                      {msg.aiBatch && !msg.loading && (
                        <div className="space-y-2 mt-2">
                          {msg.aiBatch.map((item, i) => (
                            <CreatedItemCard key={i} response={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* ── Input ── */}
            <div className="flex-shrink-0 px-3 py-3" style={{ borderTop: `1px solid ${borderColor}` }}>
              <div className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{ background: inputBg, border: `1px solid ${borderColor}` }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Brain dump or single request…"
                  rows={1}
                  disabled={sending}
                  className="flex-1 bg-transparent text-sm text-white resize-none focus:outline-none placeholder-white/25 max-h-[80px] leading-5 disabled:opacity-50"
                  style={{ scrollbarWidth: 'none' }}
                />
                {voiceSupported && (
                  <motion.button
                    onClick={toggleVoice}
                    disabled={sending}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      listening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-[#1a1a1a] text-white/70 hover:text-white hover:bg-[#222222]',
                    )}
                    title={listening ? 'Stop listening' : 'Speak your input'}
                  >
                    {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </motion.button>
                )}
                <motion.button
                  onClick={() => send()}
                  disabled={!input.trim() || sending}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                  style={{ background: theme.accentColor }}
                >
                  {sending
                    ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                    : <Send    className="w-3.5 h-3.5 text-black" />}
                </motion.button>
              </div>
              <p className="text-center text-[10px] text-white/20 mt-1.5">
                Enter to send · Shift+Enter for new line{voiceSupported && ' · 🎤 voice supported'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
