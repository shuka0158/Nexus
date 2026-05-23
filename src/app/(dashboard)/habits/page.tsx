'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, Check, Trash2, Edit3, X, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { subscribeToHabits, createHabit, updateHabit, deleteHabit } from '@/lib/firestore';
import { Habit, HabitFrequency } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const HABIT_COLORS = ['#f97316','#ef4444','#a855f7','#00d4ff','#22c55e','#eab308','#f43f5e','#06b6d4'];
const HABIT_EMOJIS = ['🔥','💪','🧠','📚','🏃','🥗','💧','😴','🧘','✍️','🎯','🎸'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getStreak(completedDates: string[]): number {
  if (!completedDates.length) return 0;
  const sorted = [...completedDates].sort().reverse();
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = new Date(d.getTime() - i * 86400000).toISOString().slice(0, 10);
    if (sorted.includes(dateStr)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getLast7(completedDates: string[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), label: DAYS[d.getDay()] };
  }).map(({ date, label }) => ({ date, label, done: completedDates.includes(date) }));
}

export default function HabitsPage() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [form, setForm] = useState<{ title: string; description: string; color: string; emoji: string; frequency: HabitFrequency }>({ title: '', description: '', color: HABIT_COLORS[0], emoji: HABIT_EMOJIS[0], frequency: 'daily' });

  useEffect(() => {
    if (!user) return;
    return subscribeToHabits(user.uid, h => setHabits(h.filter(x => !x.archivedAt)));
  }, [user]);

  const openCreate = () => {
    setForm({ title: '', description: '', color: HABIT_COLORS[0], emoji: HABIT_EMOJIS[0], frequency: 'daily' });
    setEditHabit(null);
    setShowForm(true);
  };

  const openEdit = (h: Habit) => {
    setForm({ title: h.title, description: h.description, color: h.color, emoji: h.emoji, frequency: h.frequency });
    setEditHabit(h);
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !form.title.trim()) return;
    try {
      if (editHabit) {
        await updateHabit(editHabit.id, { title: form.title, description: form.description, color: form.color, emoji: form.emoji, frequency: form.frequency });
        toast.success('Habit updated');
      } else {
        await createHabit({ userId: user.uid, ...form, targetDays: [], completedDates: [], archivedAt: null });
        toast.success('Habit created');
      }
      setShowForm(false);
    } catch { toast.error('Failed to save'); }
  };

  const toggleToday = async (habit: Habit) => {
    const today = todayStr();
    const done = habit.completedDates.includes(today);
    const next = done
      ? habit.completedDates.filter(d => d !== today)
      : [...habit.completedDates, today];
    await updateHabit(habit.id, { completedDates: next });
    if (!done) toast.success(`${habit.emoji} ${habit.title} — done!`);
  };

  const handleDelete = async (id: string) => {
    await deleteHabit(id);
    toast.success('Habit deleted');
  };

  const totalDoneToday = habits.filter(h => h.completedDates.includes(todayStr())).length;

  return (
    <DashboardLayout title="Habits" subtitle="Build streaks, build yourself">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Today', value: `${totalDoneToday}/${habits.length}`, color: theme.accentColor },
          { label: 'Longest streak', value: Math.max(0, ...habits.map(h => getStreak(h.completedDates))) + ' days', color: '#f97316' },
          { label: 'Total habits', value: habits.length, color: theme.secondaryColor },
        ].map(s => (
          <GlassCard key={s.label} padding="md" className="text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Your habits</h2>
        <NeonButton onClick={openCreate} icon={<Plus className="w-4 h-4" />} glow size="sm">Add Habit</NeonButton>
      </div>

      {/* Habits list */}
      {habits.length === 0 ? (
        <GlassCard padding="lg" className="text-center py-16">
          <Flame className="w-12 h-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">No habits yet. Add your first one!</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => {
            const streak = getStreak(habit.completedDates);
            const last7 = getLast7(habit.completedDates);
            const doneToday = habit.completedDates.includes(todayStr());
            return (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-2xl border border-white/8 p-4 transition-all hover:border-white/20"
                style={{ background: `linear-gradient(135deg, ${habit.color}10, ${habit.color}05)`, borderLeft: `3px solid ${habit.color}` }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleToday(habit)}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all flex-shrink-0',
                      doneToday ? 'scale-110' : 'opacity-60 hover:opacity-100'
                    )}
                    style={{ background: doneToday ? habit.color : `${habit.color}20` }}
                  >
                    {doneToday ? <Check className="w-5 h-5 text-white" /> : <span>{habit.emoji}</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{habit.title}</p>
                      {streak > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ background: `${habit.color}25`, color: habit.color }}>
                          🔥 {streak}
                        </span>
                      )}
                    </div>
                    {/* 7-day heatmap */}
                    <div className="flex items-center gap-1 mt-2">
                      {last7.map(({ date, label, done }) => (
                        <div key={date} className="flex flex-col items-center gap-0.5">
                          <div className={cn('w-5 h-5 rounded-sm transition-all')}
                            style={{ background: done ? habit.color : `${habit.color}20` }} />
                          <span className="text-[8px] text-white/25">{label[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(habit)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(habit.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: isDark ? 'rgba(10,10,25,0.98)' : 'rgba(248,250,252,0.98)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <p className="font-semibold text-white">{editHabit ? 'Edit Habit' : 'New Habit'}</p>
                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <input
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Habit name (e.g. Drink water)"
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--accent)]"
                />
                <input
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--accent)]"
                />
                <div>
                  <p className="text-xs text-white/40 mb-2">Pick emoji</p>
                  <div className="flex flex-wrap gap-2">
                    {HABIT_EMOJIS.map(e => (
                      <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                        className={cn('w-9 h-9 rounded-xl text-lg transition-all hover:scale-110', form.emoji === e ? 'ring-2 ring-white/50 scale-110' : 'bg-white/5')}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-2">Color</p>
                  <div className="flex gap-2">
                    {HABIT_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                        style={{ background: c, outline: form.color === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8">
                <NeonButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</NeonButton>
                <NeonButton size="sm" glow onClick={save}>Save</NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
