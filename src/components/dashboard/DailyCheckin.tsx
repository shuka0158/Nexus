'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sparkles, Check, X as XIcon, Loader2, BookOpen } from 'lucide-react';
import { getCheckin, saveCheckin } from '@/lib/firestore';
import { generateJournalEntry, geminiAvailable } from '@/lib/gemini';
import { DailyCheckin as DailyCheckinModel } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Local YYYY-MM-DD key
const dateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const MORNING_QS = [
  { id: 'oneThing', label: "What's the one thing you want to do today?", placeholder: 'Just one. Be specific.' },
  { id: 'feeling',  label: 'How are you feeling? (1–3 words)',           placeholder: 'tired but optimistic' },
  { id: 'blocker',  label: 'What might trip you up?',                     placeholder: 'Skipping lunch, doomscrolling at 2pm…' },
] as const;

const EVENING_QS = [
  { id: 'accomplished',   label: 'What did you actually do?',           placeholder: "Anything counts. Don't tidy it." },
  { id: 'unplanned',      label: "What didn't go as planned?",          placeholder: "Optional. It's fine if nothing." },
  { id: 'closingFeeling', label: 'How are you feeling now?',            placeholder: 'lighter, drained, content…' },
] as const;

interface Props {
  userId: string;
  accentColor: string;
}

export const DailyCheckin: React.FC<Props> = ({ userId, accentColor }) => {
  const today = dateKey();
  const hour = new Date().getHours();
  const isEvening = hour >= 17 || hour < 5;  // 5pm–5am triggers evening mode

  const [checkin, setCheckin] = useState<DailyCheckinModel | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'morning' | 'evening'>(isEvening ? 'evening' : 'morning');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const c = await getCheckin(userId, today);
    setCheckin(c);
  }, [userId, today]);

  useEffect(() => { refresh(); }, [refresh]);

  const morningDone = !!checkin?.morning?.completedAt;
  const eveningDone = !!checkin?.evening?.completedAt;
  const journal = checkin?.journalEntry;

  const startMode = (m: 'morning' | 'evening') => {
    setMode(m);
    setAnswers((checkin?.[m]?.answers as Record<string, string>) ?? {});
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const patch = mode === 'morning'
        ? { morning: { completedAt: Timestamp.now(), answers } }
        : { evening: { completedAt: Timestamp.now(), answers } };
      await saveCheckin(userId, today, patch);

      // After evening, if both halves are done and Gemini is configured, generate a journal entry
      if (mode === 'evening' && geminiAvailable()) {
        try {
          setGenerating(true);
          const updated = await getCheckin(userId, today);
          if (updated?.morning?.completedAt) {
            const entry = await generateJournalEntry({
              date: today,
              morning: updated.morning.answers,
              evening: updated.evening.answers,
            });
            await saveCheckin(userId, today, { journalEntry: entry });
          }
        } catch { /* AI failure is non-fatal */ }
        finally { setGenerating(false); }
      }

      await refresh();
      toast.success(mode === 'morning' ? 'Morning logged.' : 'Day closed.');
      setOpen(false);
    } catch {
      toast.error('Could not save check-in.');
    } finally {
      setSaving(false);
    }
  };

  // Render: nothing to show? Don't render anything (dashboard stays clean for muted users).
  if (morningDone && eveningDone && !generating && journal) {
    return <JournalDisplay entry={journal} accentColor={accentColor} />;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-[#333333] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accentColor}10 0%, transparent 100%)` }}
      >
        <div className="p-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}
          >
            {isEvening
              ? <Moon className="w-5 h-5" style={{ color: accentColor }} />
              : <Sun  className="w-5 h-5" style={{ color: accentColor }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-white/40 font-medium">Daily check-in</p>
            <p className="text-sm font-semibold text-white">
              {isEvening
                ? (eveningDone ? 'Closing reflection saved' : 'How did today go?')
                : (morningDone ? "Morning intent set" : "Start your day in 30 seconds")}
            </p>
          </div>
          {((isEvening && !eveningDone) || (!isEvening && !morningDone)) && (
            <button
              onClick={() => startMode(isEvening ? 'evening' : 'morning')}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-[#e0e0e0] transition-colors flex-shrink-0"
            >
              {isEvening ? 'Close day' : 'Start'}
            </button>
          )}
        </div>
        {/* Tiny progress markers */}
        <div className="flex items-center gap-3 px-4 pb-3 text-[10px] text-white/40">
          <span className={cn('inline-flex items-center gap-1', morningDone && 'text-white/70')}>
            {morningDone ? <Check className="w-3 h-3 text-green-400" /> : <span className="w-2 h-2 rounded-full border border-white/30" />}
            Morning
          </span>
          <span className={cn('inline-flex items-center gap-1', eveningDone && 'text-white/70')}>
            {eveningDone ? <Check className="w-3 h-3 text-green-400" /> : <span className="w-2 h-2 rounded-full border border-white/30" />}
            Evening
          </span>
          {generating && (
            <span className="inline-flex items-center gap-1 text-white/50">
              <Loader2 className="w-3 h-3 animate-spin" /> writing journal…
            </span>
          )}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="fixed left-1/2 -translate-x-1/2 top-[10vh] z-50 w-[min(100%-24px,440px)] rounded-2xl border border-[#333333] overflow-hidden"
              style={{ background: '#0d0d0d' }}
            >
              <div className="px-5 py-4 flex items-center gap-2 border-b border-[#222222]">
                {mode === 'morning' ? <Sun className="w-4 h-4 text-white/60" /> : <Moon className="w-4 h-4 text-white/60" />}
                <p className="text-sm font-semibold text-white flex-1">
                  {mode === 'morning' ? 'Morning check-in' : 'Closing the day'}
                </p>
                <button onClick={() => setOpen(false)} className="p-1 rounded text-white/40 hover:text-white">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {(mode === 'morning' ? MORNING_QS : EVENING_QS).map((q) => (
                  <div key={q.id}>
                    <label className="block text-xs text-white/60 mb-1.5">{q.label}</label>
                    <input
                      type="text"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                      placeholder={q.placeholder}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-[#444444] text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-white"
                    />
                  </div>
                ))}
                {mode === 'evening' && !geminiAvailable() && (
                  <p className="text-[11px] text-white/30">
                    Add a Gemini key in Settings → Integrations to get an auto-written journal entry.
                  </p>
                )}
              </div>
              <div className="px-5 py-4 flex gap-2 border-t border-[#222222]">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-[#333333] text-sm text-white/70 hover:text-white hover:border-white transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : (mode === 'morning' ? 'Set my day' : 'Close the day')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const JournalDisplay: React.FC<{ entry: string; accentColor: string }> = ({ entry, accentColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-4 sm:p-5 border"
    style={{ background: `linear-gradient(135deg, ${accentColor}10, transparent)`, borderColor: `${accentColor}30` }}
  >
    <div className="flex items-center gap-2 mb-2">
      <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
      <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: accentColor }}>Today&apos;s journal</p>
      <Sparkles className="w-3 h-3 text-white/30 ml-auto" />
    </div>
    <p className="text-sm text-white/80 leading-relaxed italic">{entry}</p>
  </motion.div>
);
