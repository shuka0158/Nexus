'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, CheckSquare, Calendar, Target, Flame, TrendingUp, ChevronLeft, ChevronRight, Download, Copy, Share2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { subscribeToTodos, subscribeToAllEvents, subscribeToHabits, subscribeToGoals } from '@/lib/firestore';
import { Todo, CalendarEvent, Habit, Goal } from '@/types';
import { cn } from '@/lib/utils';
import { WeeklyRecapCard, RecapData } from '@/components/dashboard/WeeklyRecapCard';
import toast from 'react-hot-toast';

function weekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyReviewPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [weekOffset, setWeekOffset] = useState(0);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeToTodos(user.uid, setTodos);
    const u2 = subscribeToAllEvents(user.uid, setEvents);
    const u3 = subscribeToHabits(user.uid, h => setHabits(h.filter(x => !x.archivedAt)));
    const u4 = subscribeToGoals(user.uid, setGoals);
    return () => { u1(); u2(); u3(); u4(); };
  }, [user]);

  const { start, end } = weekRange(weekOffset);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const inWeek = (d: Date) => d >= start && d <= end;

  const completedTodos = todos.filter(t => t.completedAt && inWeek(t.completedAt.toDate()));
  const weekEvents = events.filter(e => inWeek(e.startDate.toDate()));
  const activeGoals = goals.filter(g => !g.completedAt);

  // Per-day task completion
  const tasksByDay = weekDates.map(d => {
    const ds = dateStr(d);
    return completedTodos.filter(t => dateStr(t.completedAt!.toDate()) === ds).length;
  });
  const maxTasks = Math.max(...tasksByDay, 1);

  // Habit completion rate this week
  const habitHeatmap = habits.map(habit => ({
    habit,
    days: weekDates.map(d => habit.completedDates.includes(dateStr(d))),
  }));

  const weekLabel = weekOffset === 0 ? 'This Week'
    : weekOffset === -1 ? 'Last Week'
    : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // ── Shareable recap ────────────────────────────────────────────────────────
  const recapRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'download' | 'copy' | 'share' | null>(null);

  const recapData: RecapData = useMemo(() => {
    // Longest streak among the user's habits using the standard daily-streak definition
    const computeStreak = (h: Habit): number => {
      let streak = 0;
      const cursor = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = cursor.toISOString().slice(0, 10);
        if (h.completedDates.includes(ds)) streak++;
        else break;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    };
    const longestStreak = habits.reduce((m, h) => Math.max(m, computeStreak(h)), 0);
    const topTask = completedTodos[0]?.title ?? null;
    return {
      start, end,
      tasksCompleted: completedTodos.length,
      eventsAttended: weekEvents.length,
      habitsKept: habitHeatmap.reduce((a, h) => a + h.days.filter(Boolean).length, 0),
      focusMinutes: 0, // pomodoro session tracking is not yet aggregated; default 0
      longestStreak,
      topTaskTitle: topTask,
    };
  }, [start, end, completedTodos, weekEvents, habitHeatmap, habits]);

  const exportRecap = async (mode: 'download' | 'copy' | 'share') => {
    if (!recapRef.current || exporting) return;
    setExporting(mode);
    try {
      const { toPng, toBlob } = await import('html-to-image');
      const filename = `nexus-week-${start.toISOString().slice(0, 10)}.png`;
      if (mode === 'download') {
        const dataUrl = await toPng(recapRef.current, { pixelRatio: 1, cacheBust: true });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Recap downloaded');
      } else if (mode === 'copy') {
        const blob = await toBlob(recapRef.current, { pixelRatio: 1, cacheBust: true });
        if (!blob) throw new Error('Empty blob');
        if (!navigator.clipboard?.write) throw new Error('Clipboard not supported in this browser');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('Image copied — paste anywhere');
      } else if (mode === 'share') {
        const blob = await toBlob(recapRef.current, { pixelRatio: 1, cacheBust: true });
        if (!blob) throw new Error('Empty blob');
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My week on NEXUS' });
        } else {
          throw new Error('Web Share not available — try Download or Copy');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DashboardLayout title="Weekly Review" subtitle="Reflect, learn, improve">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-white font-semibold">{weekLabel}</p>
          <p className="text-xs text-white/30">
            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
          disabled={weekOffset === 0}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors disabled:opacity-20">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: CheckSquare, label: 'Tasks Done', value: completedTodos.length, color: '#22c55e' },
          { icon: Calendar,    label: 'Events',     value: weekEvents.length,      color: theme.accentColor },
          { icon: Flame,       label: 'Habit Days', value: habitHeatmap.reduce((a,h) => a + h.days.filter(Boolean).length, 0), color: '#f97316' },
          { icon: Target,      label: 'Active Goals', value: activeGoals.length,    color: '#eab308' },
        ].map(({ icon: Icon, label, value, color }) => (
          <GlassCard key={label} padding="md" className="text-center">
            <Icon className="w-5 h-5 mx-auto mb-1.5" style={{ color }} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Shareable recap */}
      <GlassCard padding="md" className="mb-6">
        <div className="flex items-start sm:items-center gap-3 mb-3 flex-col sm:flex-row">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Shareable recap</h3>
            <p className="text-xs text-white/40">Download as PNG, copy to clipboard, or share via your OS share sheet.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportRecap('download')}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
            >
              {exporting === 'download' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download
            </button>
            <button
              onClick={() => exportRecap('copy')}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#444444] text-white text-xs font-semibold hover:border-white transition-colors disabled:opacity-50"
            >
              {exporting === 'copy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              Copy
            </button>
            {typeof navigator !== 'undefined' && 'canShare' in navigator && (
              <button
                onClick={() => exportRecap('share')}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#444444] text-white text-xs font-semibold hover:border-white transition-colors disabled:opacity-50"
              >
                {exporting === 'share' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                Share
              </button>
            )}
          </div>
        </div>

        {/* Preview — the source renders at 1080x1080 (kept off-screen for export);
            we show a thumbnail render here for the user. */}
        <div className="flex justify-center">
          <div
            className="rounded-lg overflow-hidden border border-[#333333] relative"
            style={{ width: 380, height: 380 }}
          >
            <div
              style={{
                width: 1080,
                height: 1080,
                transform: 'scale(0.352)',  // 380 / 1080
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <WeeklyRecapCard
                ref={recapRef}
                data={recapData}
                accent={theme.accentColor}
                userName={user?.displayName ?? 'My'}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily task bar chart */}
        <GlassCard padding="lg">
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: theme.accentColor }} /> Tasks Completed Per Day
          </p>
          <div className="flex items-end gap-2 h-32">
            {tasksByDay.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-white/40">{count || ''}</span>
                <motion.div
                  className="w-full rounded-t-md min-h-[4px]"
                  style={{ background: count > 0 ? theme.accentColor : 'rgba(255,255,255,0.08)' }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(count / maxTasks) * 96}px` }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                />
                <span className="text-[10px] text-white/30">{DAYS_SHORT[i]}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Habit heatmap */}
        <GlassCard padding="lg">
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" /> Habit Consistency
          </p>
          {habits.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No habits tracked yet</p>
          ) : (
            <div className="space-y-2.5">
              {habitHeatmap.slice(0, 6).map(({ habit, days }) => (
                <div key={habit.id} className="flex items-center gap-2">
                  <span className="text-base w-6 flex-shrink-0">{habit.emoji}</span>
                  <p className="text-xs text-white/60 w-20 truncate flex-shrink-0">{habit.title}</p>
                  <div className="flex gap-1 flex-1">
                    {days.map((done, i) => (
                      <div key={i} className="flex-1 h-5 rounded-sm transition-all"
                        style={{ background: done ? habit.color : `${habit.color}20` }} />
                    ))}
                  </div>
                  <span className="text-xs text-white/30 w-6 text-right">{days.filter(Boolean).length}/7</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Completed tasks list */}
        <GlassCard padding="lg">
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-green-400" /> Completed Tasks ({completedTodos.length})
          </p>
          {completedTodos.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No tasks completed this week</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {completedTodos.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <CheckSquare className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  <span className="text-white/60 line-through">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Events this week */}
        <GlassCard padding="lg">
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: theme.accentColor }} /> Events ({weekEvents.length})
          </p>
          {weekEvents.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No events this week</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {weekEvents.map(e => (
                <div key={e.id} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: e.color || theme.accentColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{e.title}</p>
                    <p className="text-xs text-white/30">
                      {e.startDate.toDate().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Goals progress */}
        {activeGoals.length > 0 && (
          <GlassCard padding="lg" className="lg:col-span-2">
            <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-yellow-400" /> Goals Progress
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeGoals.slice(0, 4).map(g => (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="text-lg">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 truncate mb-1">{g.title}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${g.progress}%`, background: g.color }} />
                      </div>
                      <span className="text-xs text-white/40">{g.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
}
