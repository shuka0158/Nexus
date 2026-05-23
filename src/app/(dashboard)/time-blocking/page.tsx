'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, ChevronLeft, ChevronRight, X, Check, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { subscribeToAllEvents, createEvent, deleteEvent } from '@/lib/firestore';
import { CalendarEvent } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BLOCK_COLORS = ['#00d4ff','#a855f7','#22c55e','#f97316','#f43f5e','#eab308','#06b6d4','#8b5cf6'];

function toMinutes(h: number, m: number) { return h * 60 + m; }
function fromMinutes(mins: number) { return { h: Math.floor(mins / 60), m: mins % 60 }; }
function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function TimeBlockingPage() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [dateOffset, setDateOffset] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', startHour: 9, startMin: 0, endHour: 10, endMin: 0, color: BLOCK_COLORS[0] });

  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + dateOffset);
  selectedDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(selectedDate);
  nextDay.setDate(selectedDate.getDate() + 1);

  useEffect(() => {
    if (!user) return;
    return subscribeToAllEvents(user.uid, setEvents);
  }, [user]);

  const dayEvents = events.filter(e => {
    const d = e.startDate.toDate();
    return d >= selectedDate && d < nextDay;
  }).sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());

  const addBlock = async () => {
    if (!user || !form.title.trim()) return;
    const start = new Date(selectedDate);
    start.setHours(form.startHour, form.startMin, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(form.endHour, form.endMin, 0, 0);
    if (end <= start) { toast.error('End time must be after start'); return; }
    try {
      await createEvent({
        userId: user.uid, title: form.title, description: '', allDay: false,
        startDate: Timestamp.fromDate(start), endDate: Timestamp.fromDate(end),
        color: form.color, category: 'time-block', location: '', recurring: null,
        reminderMinutes: [], attendees: [],
      });
      toast.success('Block added');
      setShowForm(false);
    } catch { toast.error('Failed to add block'); }
  };

  const removeBlock = async (id: string) => {
    await deleteEvent(id);
    toast.success('Block removed');
  };

  const dateLabel = dateOffset === 0 ? 'Today'
    : dateOffset === 1 ? 'Tomorrow'
    : dateOffset === -1 ? 'Yesterday'
    : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Build a visual grid: 6am-midnight
  const gridStart = 6;
  const gridEnd = 24;
  const gridHours = Array.from({ length: gridEnd - gridStart }, (_, i) => i + gridStart);

  return (
    <DashboardLayout title="Time Blocking" subtitle="Plan your day, own your time">
      {/* Day nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setDateOffset(d => d - 1)}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-white font-semibold">{dateLabel}</p>
          <p className="text-xs text-white/30">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setDateOffset(d => d + 1)}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Timeline grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 uppercase tracking-widest">Schedule</p>
            <NeonButton onClick={() => setShowForm(true)} icon={<Plus className="w-3.5 h-3.5" />} size="sm" glow>Add Block</NeonButton>
          </div>
          <GlassCard padding="none" className="overflow-hidden">
            <div className="relative">
              {gridHours.map((hour) => {
                const hourEvents = dayEvents.filter(e => e.startDate.toDate().getHours() === hour);
                return (
                  <div key={hour} className="flex border-b border-white/5 last:border-0 min-h-[48px]">
                    <div className="w-14 flex-shrink-0 flex items-start justify-end pr-3 pt-1.5">
                      <span className="text-[11px] text-white/20">{formatHour(hour)}</span>
                    </div>
                    <div className="flex-1 relative py-0.5 pr-2 space-y-0.5">
                      {hourEvents.map(event => {
                        const start = event.startDate.toDate();
                        const end = event.endDate.toDate();
                        const dur = Math.round((end.getTime() - start.getTime()) / 60000);
                        return (
                          <div key={event.id}
                            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-white"
                            style={{ background: `${event.color || theme.accentColor}30`, borderLeft: `3px solid ${event.color || theme.accentColor}` }}>
                            <span className="flex-1 truncate">{event.title}</span>
                            <span className="text-[10px] text-white/40 flex-shrink-0">
                              {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {dur}m
                            </span>
                            <button onClick={() => removeBlock(event.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Summary panel */}
        <div className="w-48 flex-shrink-0 hidden lg:block space-y-3">
          <GlassCard padding="md">
            <p className="text-xs text-white/40 mb-3 uppercase tracking-widest">Today&apos;s blocks</p>
            <p className="text-3xl font-bold text-white">{dayEvents.length}</p>
            <p className="text-xs text-white/30 mt-0.5">scheduled</p>
          </GlassCard>
          <GlassCard padding="md">
            <p className="text-xs text-white/40 mb-3 uppercase tracking-widest">Planned time</p>
            <p className="text-2xl font-bold" style={{ color: theme.accentColor }}>
              {Math.round(dayEvents.reduce((a, e) => a + (e.endDate.toDate().getTime() - e.startDate.toDate().getTime()) / 60000, 0) / 60 * 10) / 10}h
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Add block form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: isDark ? 'rgba(10,10,25,0.98)' : 'rgba(248,250,252,0.98)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <p className="font-semibold text-white">Add Time Block</p>
                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Block label (e.g. Deep work)" autoFocus
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--accent)]" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Start</p>
                    <div className="flex gap-1">
                      <input type="number" min={0} max={23} value={form.startHour}
                        onChange={e => setForm(f => ({ ...f, startHour: Number(e.target.value) }))}
                        className="w-full px-2 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white text-center focus:outline-none" />
                      <span className="text-white/40 self-center">:</span>
                      <input type="number" min={0} max={59} step={15} value={form.startMin}
                        onChange={e => setForm(f => ({ ...f, startMin: Number(e.target.value) }))}
                        className="w-full px-2 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white text-center focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">End</p>
                    <div className="flex gap-1">
                      <input type="number" min={0} max={23} value={form.endHour}
                        onChange={e => setForm(f => ({ ...f, endHour: Number(e.target.value) }))}
                        className="w-full px-2 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white text-center focus:outline-none" />
                      <span className="text-white/40 self-center">:</span>
                      <input type="number" min={0} max={59} step={15} value={form.endMin}
                        onChange={e => setForm(f => ({ ...f, endMin: Number(e.target.value) }))}
                        className="w-full px-2 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white text-center focus:outline-none" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Color</p>
                  <div className="flex gap-2">
                    {BLOCK_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                        style={{ background: c, outline: form.color === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8">
                <NeonButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</NeonButton>
                <NeonButton size="sm" glow onClick={addBlock} icon={<Check className="w-3.5 h-3.5" />}>Add Block</NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
