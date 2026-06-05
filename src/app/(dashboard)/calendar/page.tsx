'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  addDays, addMonths, getHours, startOfDay, getYear,
  setMonth as dfSetMonth, setYear as dfSetYear,
  isBefore, isAfter,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Grid, List, Calendar as CalIcon,
  Clock, MapPin, AlignLeft, Tag, Pencil, Trash2, X, AlertTriangle, Download,
  Search, Bell, Repeat, LayoutList, CalendarDays, PanelLeft, Share2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Modal } from '@/components/ui/Modal';
import { NeonInput } from '@/components/ui/NeonInput';
import { MapPicker } from '@/components/ui/MapPicker';
import { useCalendar } from '@/hooks/useCalendar';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CalendarEvent, CalendarView, RecurringConfig } from '@/types';
import { cn, hexToRgba } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const EVENT_COLORS = ['#00d4ff','#a855f7','#22c55e','#f97316','#ef4444','#eab308','#ec4899','#14b8a6'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const REMINDER_OPTIONS = [
  { value: 5,    label: '5 min before' },
  { value: 10,   label: '10 min before' },
  { value: 15,   label: '15 min before' },
  { value: 30,   label: '30 min before' },
  { value: 60,   label: '1 hour before' },
  { value: 120,  label: '2 hours before' },
  { value: 1440, label: '1 day before' },
];

const VIEWS: { value: CalendarView; label: string; icon: React.ReactNode }[] = [
  { value: 'month',  label: 'Month',    icon: <Grid className="w-3.5 h-3.5" /> },
  { value: 'week',   label: 'Week',     icon: <List className="w-3.5 h-3.5" /> },
  { value: 'day',    label: 'Day',      icon: <CalIcon className="w-3.5 h-3.5" /> },
  { value: 'year',   label: 'Year',     icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { value: 'agenda', label: 'Schedule', icon: <LayoutList className="w-3.5 h-3.5" /> },
];

const CALENDAR_CATEGORIES = [
  { id: 'personal',        label: 'Personal',        color: '#00d4ff' },
  { id: 'work',            label: 'Work',            color: '#a855f7' },
  { id: 'family',          label: 'Family',          color: '#22c55e' },
  { id: 'health',          label: 'Health',          color: '#ef4444' },
  { id: 'google-calendar', label: 'Google',          color: '#4285f4' },
  { id: 'general',         label: 'General',         color: '#eab308' },
];

// ─── Form types ───────────────────────────────────────────────────────────────

interface RecurringFormValues {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate: string;
}

interface EventFormValues {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  category: string;
  color: string;
  allDay: boolean;
  recurring: RecurringFormValues;
  reminders: number[];
}

const defaultRecurring = (): RecurringFormValues => ({
  enabled: false, frequency: 'weekly', interval: 1, endDate: '',
});

const defaultForm = (date?: Date): EventFormValues => {
  const base = date ?? new Date();
  const end  = new Date(base.getTime() + 60 * 60 * 1000);
  return {
    title: '', description: '', location: '', category: 'personal',
    color: EVENT_COLORS[0], allDay: false,
    startDate: format(base, "yyyy-MM-dd'T'HH:mm"),
    endDate:   format(end,  "yyyy-MM-dd'T'HH:mm"),
    recurring: defaultRecurring(),
    reminders: [15],
  };
};

const eventToForm = (e: CalendarEvent): EventFormValues => ({
  title:       e.title,
  description: e.description ?? '',
  location:    e.location ?? '',
  category:    e.category ?? 'personal',
  color:       e.color,
  allDay:      e.allDay,
  startDate:   format(e.startDate.toDate(), "yyyy-MM-dd'T'HH:mm"),
  endDate:     format(e.endDate.toDate(),   "yyyy-MM-dd'T'HH:mm"),
  recurring: e.recurring ? {
    enabled: true,
    frequency: e.recurring.frequency,
    interval: e.recurring.interval,
    endDate: e.recurring.endDate ? format(e.recurring.endDate.toDate(), 'yyyy-MM-dd') : '',
  } : defaultRecurring(),
  reminders: e.reminderMinutes?.length ? e.reminderMinutes : [15],
});

const formToRecurring = (r: RecurringFormValues): RecurringConfig | null => {
  if (!r.enabled) return null;
  return {
    frequency: r.frequency,
    interval: r.interval,
    ...(r.endDate ? { endDate: Timestamp.fromDate(new Date(r.endDate)) } : {}),
  };
};

// ─── Mini Calendar (sidebar) ──────────────────────────────────────────────────

const MiniCalendar: React.FC<{
  displayDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onDateSelect: (d: Date) => void;
  onMonthChange: (d: Date) => void;
  accentColor: string;
}> = ({ displayDate, selectedDate, events, onDateSelect, onMonthChange, accentColor }) => {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(displayDate)),
    end: endOfWeek(endOfMonth(displayDate)),
  });
  return (
    <div className="p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onMonthChange(addMonths(displayDate, -1))}
          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDateSelect(new Date())}
          className="text-xs font-semibold text-white/80 hover:text-white transition-colors">
          {format(displayDate, 'MMM yyyy')}
        </button>
        <button onClick={() => onMonthChange(addMonths(displayDate, 1))}
          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-[9px] font-medium text-white/25 py-0.5">{d[0]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const hasEvents = events.some((e) => isSameDay(e.startDate.toDate(), day));
          const inMonth   = isSameMonth(day, displayDate);
          const isSelected = isSameDay(day, selectedDate);
          const today     = isToday(day);
          return (
            <button key={day.toString()} onClick={() => onDateSelect(day)}
              className={cn(
                'relative w-6 h-6 rounded-full flex items-center justify-center mx-auto text-[10px] font-medium transition-all',
                !inMonth && 'opacity-20',
                isSelected && 'text-black',
                !isSelected && today && 'font-bold',
                !isSelected && !today && 'text-white/60 hover:text-white hover:bg-white/10',
              )}
              style={isSelected ? { background: accentColor } : today && !isSelected ? { color: accentColor } : {}}>
              {format(day, 'd')}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: accentColor }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Event Form (shared) ──────────────────────────────────────────────────────

const EventForm: React.FC<{ values: EventFormValues; onChange: (v: EventFormValues) => void }> = ({ values, onChange }) => {
  const set = (patch: Partial<EventFormValues>) => onChange({ ...values, ...patch });
  const setRecurring = (patch: Partial<RecurringFormValues>) => set({ recurring: { ...values.recurring, ...patch } });
  const [mapOpen, setMapOpen] = useState(false);

  const addReminder = () => {
    const next = REMINDER_OPTIONS.find((o) => !values.reminders.includes(o.value))?.value ?? 15;
    set({ reminders: [...values.reminders, next] });
  };
  const removeReminder = (i: number) => set({ reminders: values.reminders.filter((_, idx) => idx !== i) });
  const setReminder = (i: number, val: number) => {
    const r = [...values.reminders]; r[i] = val; set({ reminders: r });
  };

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <NeonInput label="Title *" placeholder="Event title" value={values.title}
        onChange={(e) => set({ title: e.target.value })} autoFocus />
      <NeonInput label="Description" placeholder="Optional details" value={values.description}
        onChange={(e) => set({ description: e.target.value })} />

      <div className="flex items-center gap-3">
        <input type="checkbox" id="allDay" checked={values.allDay} onChange={(e) => set({ allDay: e.target.checked })} className="accent-[var(--accent)]" />
        <label htmlFor="allDay" className="text-sm text-white/60 select-none cursor-pointer">All day</label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NeonInput label="Start" type={values.allDay ? 'date' : 'datetime-local'}
          value={values.allDay ? values.startDate.split('T')[0] : values.startDate}
          onChange={(e) => set({ startDate: values.allDay ? `${e.target.value}T00:00` : e.target.value })} />
        <NeonInput label="End" type={values.allDay ? 'date' : 'datetime-local'}
          value={values.allDay ? values.endDate.split('T')[0] : values.endDate}
          onChange={(e) => set({ endDate: values.allDay ? `${e.target.value}T23:59` : e.target.value })} />
      </div>

      <div>
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">Location</label>
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            placeholder="Optional location"
            value={values.location}
            onChange={(e) => set({ location: e.target.value })}
            className="flex-1 px-3 py-2 rounded bg-[#000000] border border-[#444444] text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
          />
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="flex items-center gap-1.5 px-3 rounded border border-[#444444] text-xs text-white/70 hover:text-white hover:border-white hover:bg-[#1a1a1a] transition-colors flex-shrink-0"
            title="Pick on map"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>
      <MapPicker
        open={mapOpen}
        initialQuery={values.location}
        onClose={() => setMapOpen(false)}
        onSelect={(addr) => set({ location: addr })}
      />

      {/* Category */}
      <div>
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Calendar</p>
        <div className="flex flex-wrap gap-1.5">
          {CALENDAR_CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => set({ category: cat.id })}
              className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                values.category === cat.id ? 'text-white border-transparent' : 'text-white/40 border-white/10 hover:text-white/70')}
              style={values.category === cat.id ? { background: hexToRgba(cat.color, 0.3), borderColor: cat.color } : {}}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: cat.color }} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Color</p>
        <div className="flex items-center gap-2 flex-wrap">
          {EVENT_COLORS.map((c) => (
            <button key={c} onClick={() => set({ color: c })}
              className={cn('w-7 h-7 rounded-full transition-transform', values.color === c && 'scale-125 ring-2 ring-white/40 ring-offset-1 ring-offset-black')}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-3 h-3" /> Reminders
          </p>
          {values.reminders.length < 4 && (
            <button onClick={addReminder} className="text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {values.reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={r} onChange={(e) => setReminder(i, Number(e.target.value))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/30 [&>option]:bg-[#0f0f1e]">
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button onClick={() => removeReminder(i)} className="p-1 rounded text-white/30 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {values.reminders.length === 0 && (
            <p className="text-xs text-white/25 italic">No reminders set</p>
          )}
        </div>
      </div>

      {/* Recurring */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <input type="checkbox" id="recurring" checked={values.recurring.enabled}
            onChange={(e) => setRecurring({ enabled: e.target.checked })} className="accent-[var(--accent)]" />
          <label htmlFor="recurring" className="text-sm text-white/60 select-none cursor-pointer flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" /> Repeat event
          </label>
        </div>
        {values.recurring.enabled && (
          <div className="ml-6 space-y-2 p-3 rounded-xl bg-white/3 border border-white/8">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Frequency</p>
                <select value={values.recurring.frequency}
                  onChange={(e) => setRecurring({ frequency: e.target.value as RecurringFormValues['frequency'] })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/30 [&>option]:bg-[#0f0f1e]">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Every</p>
                <input type="number" min={1} max={99} value={values.recurring.interval}
                  onChange={(e) => setRecurring({ interval: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/30" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">End date (optional)</p>
              <input type="date" value={values.recurring.endDate}
                onChange={(e) => setRecurring({ endDate: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/30" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Add Event Modal ──────────────────────────────────────────────────────────

const AddEventModal: React.FC<{
  isOpen: boolean; onClose: () => void; defaultDate?: Date;
  onAdd: (data: {
    title: string; description?: string; startDate: Date; endDate: Date;
    allDay?: boolean; color?: string; category?: string; location?: string;
    recurring?: RecurringConfig | null; reminderMinutes?: number[];
  }) => Promise<void>;
}> = ({ isOpen, onClose, defaultDate, onAdd }) => {
  const [form, setForm] = useState<EventFormValues>(() => defaultForm(defaultDate));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) { toast.error('End must be after start'); return; }
    setLoading(true);
    try {
      await onAdd({
        title: form.title, description: form.description, color: form.color,
        category: form.category, location: form.location, allDay: form.allDay,
        startDate: new Date(form.startDate), endDate: new Date(form.endDate),
        recurring: formToRecurring(form.recurring),
        reminderMinutes: form.reminders,
      });
      toast.success('Event created!');
      onClose();
      setForm(defaultForm(defaultDate));
    } catch { toast.error('Failed to create event'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Event" size="md">
      <EventForm values={form} onChange={setForm} />
      <div className="flex gap-3 pt-4">
        <NeonButton variant="ghost" onClick={onClose} className="flex-1">Cancel</NeonButton>
        <NeonButton onClick={handleSubmit} loading={loading} glow className="flex-1">Create Event</NeonButton>
      </div>
    </Modal>
  );
};

// ─── Edit Event Modal ─────────────────────────────────────────────────────────

const EditEventModal: React.FC<{
  event: CalendarEvent; onClose: () => void;
  onSave: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
}> = ({ event, onClose, onSave }) => {
  const [form, setForm] = useState<EventFormValues>(() => eventToForm(event));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) { toast.error('End must be after start'); return; }
    setLoading(true);
    try {
      await onSave(event.id, {
        title: form.title, description: form.description, color: form.color,
        category: form.category, location: form.location, allDay: form.allDay,
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        endDate:   Timestamp.fromDate(new Date(form.endDate)),
        recurring: formToRecurring(form.recurring),
        reminderMinutes: form.reminders,
      });
      toast.success('Event updated!');
      onClose();
    } catch { toast.error('Failed to update event'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit Event" size="md">
      <EventForm values={form} onChange={setForm} />
      <div className="flex gap-3 pt-4">
        <NeonButton variant="ghost" onClick={onClose} className="flex-1">Cancel</NeonButton>
        <NeonButton onClick={handleSave} loading={loading} glow className="flex-1">Save Changes</NeonButton>
      </div>
    </Modal>
  );
};

// ─── Event Detail Modal ───────────────────────────────────────────────────────

const EventDetailModal: React.FC<{
  event: CalendarEvent; onClose: () => void;
  onEdit: () => void; onDelete: (id: string) => Promise<void>;
}> = ({ event, onClose, onEdit, onDelete }) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const copyShareLink = () => {
    const url = `${window.location.origin}/event?id=${event.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Share link copied!'));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(event.id); toast.success('Event deleted'); onClose(); }
    catch { toast.error('Failed to delete event'); setDeleting(false); }
  };

  const startFmt = format(event.startDate.toDate(), event.allDay ? 'EEE, MMM d, yyyy' : 'EEE, MMM d, yyyy · HH:mm');
  const endFmt   = format(event.endDate.toDate(),   event.allDay ? 'EEE, MMM d, yyyy' : 'HH:mm');
  const sameDay  = isSameDay(event.startDate.toDate(), event.endDate.toDate());
  const cat      = CALENDAR_CATEGORIES.find((c) => c.id === event.category);

  return (
    <Modal isOpen onClose={onClose} title="" size="sm">
      <div className="relative -mx-6 -mt-6 mb-5 px-6 pt-5 pb-4 rounded-t-2xl overflow-hidden">
        <div className="absolute inset-0" style={{ background: hexToRgba(event.color, 0.18), borderBottom: `1px solid ${hexToRgba(event.color, 0.25)}` }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: event.color, boxShadow: `0 0 10px ${event.color}60` }} />
            <h2 className="text-lg font-bold text-white leading-tight">{event.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg text-white/30 hover:text-white/70 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        {cat && (
          <div className="relative mt-2 ml-7">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: hexToRgba(cat.color, 0.2), color: cat.color }}>
              {cat.label}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/70">
            <p>{startFmt}</p>
            {!event.allDay && <p className="text-white/40">{sameDay ? `Ends at ${endFmt}` : `→ ${endFmt}`}</p>}
          </div>
        </div>
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/70">{event.location}</p>
          </div>
        )}
        {event.description && (
          <div className="flex items-start gap-3">
            <AlignLeft className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/60 leading-relaxed">{event.description}</p>
          </div>
        )}
        {event.recurring && (
          <div className="flex items-center gap-3">
            <Repeat className="w-4 h-4 text-white/30 flex-shrink-0" />
            <p className="text-sm text-white/50 capitalize">
              Repeats {event.recurring.frequency} every {event.recurring.interval > 1 ? `${event.recurring.interval} ` : ''}
              {event.recurring.frequency === 'daily' ? 'day' : event.recurring.frequency.replace('ly', '')}
              {event.recurring.interval > 1 ? 's' : ''}
            </p>
          </div>
        )}
        {(event.reminderMinutes?.length ?? 0) > 0 && (
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-white/30 flex-shrink-0" />
            <p className="text-sm text-white/50">
              {event.reminderMinutes?.map((m) => m >= 1440 ? '1 day' : m >= 60 ? `${m / 60}h` : `${m}min`).join(', ')} before
            </p>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!confirming ? (
          <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2 pt-3 border-t border-white/8">
            <NeonButton variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit} className="flex-1">Edit</NeonButton>
            <button onClick={copyShareLink}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <NeonButton variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setConfirming(true)} className="flex-1">Delete</NeonButton>
          </motion.div>
        ) : (
          <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="pt-3 border-t border-white/8 space-y-3">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              Delete &quot;{event.title}&quot;? This cannot be undone.
            </div>
            <div className="flex gap-2">
              <NeonButton variant="ghost" size="sm" onClick={() => setConfirming(false)} className="flex-1">Cancel</NeonButton>
              <NeonButton variant="danger" size="sm" loading={deleting} onClick={handleDelete} className="flex-1">Delete</NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

// ─── Month View ───────────────────────────────────────────────────────────────

const MonthView: React.FC<{
  currentDate: Date; events: CalendarEvent[];
  onDateClick: (d: Date) => void; onEventClick: (e: CalendarEvent) => void;
  accentColor: string;
}> = ({ currentDate, events, onDateClick, onEventClick, accentColor }) => {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) });
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-white/30 py-2 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px flex-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.startDate.toDate(), day));
          const inMonth   = isSameMonth(day, currentDate);
          return (
            <div key={day.toString()} onClick={() => onDateClick(day)}
              className={cn('min-h-[90px] p-1.5 cursor-pointer transition-colors bg-dark-800/60 hover:bg-dark-700/60 group', !inMonth && 'opacity-30')}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  isToday(day) ? 'text-black font-bold' : inMonth ? 'text-white/70' : 'text-white/20')}
                  style={isToday(day) ? { background: accentColor, boxShadow: `0 0 12px ${accentColor}60` } : {}}>
                  {format(day, 'd')}
                </span>
                <Plus className="w-3 h-3 text-white/0 group-hover:text-white/20 transition-colors" />
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <motion.div key={event.id} whileHover={{ scale: 1.02 }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                    className="truncate text-[10px] font-medium rounded px-1.5 py-0.5 cursor-pointer flex items-center gap-1"
                    style={{ background: hexToRgba(event.color, 0.22), color: event.color }}>
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: event.color }} />
                    {event.title}
                  </motion.div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-white/30 pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Week View ────────────────────────────────────────────────────────────────

const WeekView: React.FC<{
  currentDate: Date; events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void; accentColor: string;
}> = ({ currentDate, events, onEventClick, accentColor }) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));
  return (
    <div className="flex flex-col h-[600px] overflow-hidden">
      <div className="grid grid-cols-8 border-b border-white/5">
        <div className="py-3" />
        {days.map((day) => (
          <div key={day.toString()} className="py-3 text-center">
            <div className="text-xs text-white/30 uppercase">{format(day, 'EEE')}</div>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 text-sm font-medium', isToday(day) ? 'text-black' : 'text-white/70')}
              style={isToday(day) ? { background: accentColor } : {}}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-white/3" style={{ height: 60 }}>
            <div className="flex items-start justify-end pr-3 pt-1">
              <span className="text-[10px] text-white/20">{hour.toString().padStart(2,'0')}:00</span>
            </div>
            {days.map((day) => {
              const dayEvents = events.filter((e) => isSameDay(e.startDate.toDate(), day) && getHours(e.startDate.toDate()) === hour);
              return (
                <div key={day.toString()} className="relative border-l border-white/3 p-0.5">
                  {dayEvents.map((event) => (
                    <motion.div key={event.id} whileHover={{ scale: 1.02, zIndex: 10 }}
                      onClick={() => onEventClick(event)}
                      className="rounded px-1.5 py-1 text-[10px] font-medium cursor-pointer truncate"
                      style={{ background: hexToRgba(event.color, 0.25), color: event.color, borderLeft: `2px solid ${event.color}` }}>
                      {event.title}
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Day View ─────────────────────────────────────────────────────────────────

const DayView: React.FC<{
  currentDate: Date; events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}> = ({ currentDate, events, onEventClick }) => (
  <div className="h-[600px] overflow-y-auto">
    {HOURS.map((hour) => {
      const hourEvents = events.filter((e) => isSameDay(e.startDate.toDate(), currentDate) && getHours(e.startDate.toDate()) === hour);
      return (
        <div key={hour} className="flex gap-4 border-b border-white/3 py-2 min-h-[60px]">
          <div className="w-16 text-right flex-shrink-0 pt-0.5">
            <span className="text-xs text-white/20">{hour.toString().padStart(2,'0')}:00</span>
          </div>
          <div className="flex-1 space-y-1">
            {hourEvents.map((event) => (
              <motion.div key={event.id} whileHover={{ scale: 1.01 }} onClick={() => onEventClick(event)}
                className="rounded-lg px-3 py-2 cursor-pointer"
                style={{ background: hexToRgba(event.color, 0.18), borderLeft: `3px solid ${event.color}` }}>
                <p className="text-sm font-semibold" style={{ color: event.color }}>{event.title}</p>
                {event.location && <p className="text-xs text-white/40 mt-0.5">📍 {event.location}</p>}
                {event.description && <p className="text-xs text-white/40 mt-0.5">{event.description}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

// ─── Year View ────────────────────────────────────────────────────────────────

const YearView: React.FC<{
  currentDate: Date; events: CalendarEvent[];
  onMonthClick: (d: Date) => void; accentColor: string;
}> = ({ currentDate, events, onMonthClick, accentColor }) => {
  const year = getYear(currentDate);
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 p-2">
      {months.map((monthDate) => {
        const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(monthDate)), end: endOfWeek(endOfMonth(monthDate)) });
        const isCurrentMonth = isSameMonth(monthDate, new Date());
        return (
          <div key={monthDate.toString()} onClick={() => onMonthClick(monthDate)}
            className={cn('rounded-xl p-2 cursor-pointer transition-all hover:bg-white/5 border',
              isCurrentMonth ? 'border-white/15' : 'border-transparent')}>
            <p className={cn('text-xs font-semibold mb-2 text-center', isCurrentMonth ? 'text-white' : 'text-white/50')}>
              {format(monthDate, 'MMMM')}
            </p>
            <div className="grid grid-cols-7 gap-y-0.5">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="text-[7px] text-center text-white/20 font-medium">{d[0]}</div>
              ))}
              {days.map((day) => {
                const hasEvents = events.some((e) => isSameDay(e.startDate.toDate(), day));
                const inMonth   = isSameMonth(day, monthDate);
                const today     = isToday(day);
                return (
                  <div key={day.toString()}
                    className={cn('relative w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[8px] font-medium',
                      !inMonth && 'opacity-0',
                      today ? 'text-black' : 'text-white/50')}
                    style={today ? { background: accentColor } : {}}>
                    {inMonth ? format(day, 'd') : ''}
                    {hasEvents && inMonth && !today && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full"
                        style={{ background: accentColor }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Agenda View ──────────────────────────────────────────────────────────────

const AgendaView: React.FC<{
  events: CalendarEvent[];
  fromDate: Date;
  onEventClick: (e: CalendarEvent) => void;
  accentColor: string;
}> = ({ events, fromDate, onEventClick, accentColor }) => {
  const upcoming = events
    .filter((e) => !isBefore(e.endDate.toDate(), startOfDay(fromDate)))
    .sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    upcoming.forEach((e) => {
      const key = format(e.startDate.toDate(), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).map(([key, evts]) => ({ date: new Date(key), events: evts }));
  }, [upcoming]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30">
        <CalIcon className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] overflow-y-auto space-y-6 pr-1">
      {grouped.map(({ date, events: dayEvents }) => (
        <div key={date.toString()}>
          <div className="flex items-center gap-3 mb-3 sticky top-0 py-1 bg-dark-800/80 backdrop-blur-sm z-10">
            <div className={cn('flex flex-col items-center w-12 rounded-xl p-1.5 flex-shrink-0',
              isToday(date) ? 'text-black' : 'bg-white/5')}
              style={isToday(date) ? { background: accentColor } : {}}>
              <span className="text-[10px] font-medium uppercase opacity-80">{format(date, 'EEE')}</span>
              <span className="text-xl font-bold leading-none">{format(date, 'd')}</span>
            </div>
            <div>
              <p className={cn('text-sm font-semibold', isToday(date) ? 'text-white' : 'text-white/70')}>
                {isToday(date) ? 'Today' : format(date, 'EEEE')}
              </p>
              <p className="text-xs text-white/30">{format(date, 'MMMM d, yyyy')}</p>
            </div>
          </div>
          <div className="ml-15 space-y-2" style={{ marginLeft: '60px' }}>
            {dayEvents.map((event) => (
              <motion.div key={event.id} whileHover={{ x: 2 }} onClick={() => onEventClick(event)}
                className="rounded-xl p-3 cursor-pointer flex items-start gap-3 border border-transparent hover:border-white/8 transition-all"
                style={{ background: hexToRgba(event.color, 0.12) }}>
                <div className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0 mt-0.5" style={{ background: event.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: event.color }}>
                    {event.allDay ? 'All day' : `${format(event.startDate.toDate(), 'HH:mm')} – ${format(event.endDate.toDate(), 'HH:mm')}`}
                  </p>
                  {event.location && <p className="text-xs text-white/40 mt-0.5">📍 {event.location}</p>}
                </div>
                <div className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: event.color }} />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── ICS Export ───────────────────────────────────────────────────────────────

function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function exportICS(events: CalendarEvent[]) {
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NEXUS//NEXUS Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  events.forEach((e) => {
    const vevent = [
      'BEGIN:VEVENT',
      `UID:${e.id}@nexus`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(e.startDate.toDate())}`,
      `DTEND:${toICSDate(e.endDate.toDate())}`,
      `SUMMARY:${e.title.replace(/,/g, '\\,')}`,
      ...(e.description ? [`DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`] : []),
      ...(e.location ? [`LOCATION:${e.location}`] : []),
      'END:VEVENT',
    ];
    lines.push(...vevent);
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'nexus-calendar.ics'; a.click();
  URL.revokeObjectURL(url);
  toast.success('Calendar exported!');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { events, currentDate, view, navigate, setView, setCurrentDate, addEvent: addEventLocal, editEvent, removeEvent } = useCalendar();
  const { user } = useAuth();
  const { pushToAll, accounts: gcalAccounts } = useGoogleCalendarSync(user?.uid ?? '');

  // Wrap addEvent so that creating a local event also pushes it to every connected Google account
  const addEvent = async (data: Parameters<typeof addEventLocal>[0]) => {
    const id = await addEventLocal(data);
    if (gcalAccounts.length > 0) {
      try {
        await pushToAll({
          title: data.title,
          description: data.description ?? '',
          startDate: Timestamp.fromDate(data.startDate),
          endDate:   Timestamp.fromDate(data.endDate),
          allDay: data.allDay ?? false,
          color: data.color ?? '#00d4ff',
          category: data.category ?? 'personal',
          location: data.location ?? '',
          recurring: data.recurring ?? null,
          reminderMinutes: data.reminderMinutes ?? [],
          attendees: [],
        });
      } catch { /* push errors are non-fatal */ }
    }
    return id;
  };
  const { theme } = useTheme();

  const [sidebarOpen,    setSidebarOpen]    = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [addModalOpen,   setAddModalOpen]   = useState(false);
  const [selectedDate,   setSelectedDate]   = useState<Date | null>(null);
  const [detailEvent,    setDetailEvent]    = useState<CalendarEvent | null>(null);
  const [editingEvent,   setEditingEvent]   = useState<CalendarEvent | null>(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [miniCalDate,    setMiniCalDate]    = useState(new Date());
  const [hiddenCats,     setHiddenCats]     = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    setHiddenCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    const seen = new Set<string>();
    let result = events
      .filter((e) => !hiddenCats.has(e.category ?? 'general'))
      .filter((e) => {
        const key = `${e.title}|${e.startDate.toMillis()}|${e.endDate.toMillis()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, hiddenCats, searchQuery]);

  const openDetail = (event: CalendarEvent) => { setDetailEvent(event); setEditingEvent(null); };
  const openEdit   = () => { if (!detailEvent) return; setEditingEvent(detailEvent); setDetailEvent(null); };

  const handleMiniCalDateSelect = (date: Date) => {
    setCurrentDate(date);
    setMiniCalDate(date);
    setView('day');
  };

  const titleLabel = useMemo(() => {
    if (view === 'month')  return format(currentDate, 'MMMM yyyy');
    if (view === 'week')   return `${format(startOfWeek(currentDate), 'MMM d')} – ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`;
    if (view === 'day')    return format(currentDate, 'EEEE, MMMM d, yyyy');
    if (view === 'year')   return format(currentDate, 'yyyy');
    if (view === 'agenda') return `Schedule · ${format(currentDate, 'MMM d, yyyy')}`;
    return '';
  }, [view, currentDate]);

  return (
    <DashboardLayout title="Calendar" subtitle={titleLabel}>
      <div className="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto">

        {/* ── Sidebar — stacks above on mobile, fixed column on desktop ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 space-y-3 w-full md:w-[224px]">

              <NeonButton glow icon={<Plus className="w-4 h-4" />} className="w-full"
                onClick={() => { setSelectedDate(currentDate); setAddModalOpen(true); }}>
                New Event
              </NeonButton>

              <GlassCard padding="none">
                <MiniCalendar
                  displayDate={miniCalDate}
                  selectedDate={currentDate}
                  events={filteredEvents}
                  onDateSelect={handleMiniCalDateSelect}
                  onMonthChange={setMiniCalDate}
                  accentColor={theme.accentColor}
                />
              </GlassCard>

              <GlassCard padding="sm">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-2 pt-1 mb-2">Calendars</p>
                <div className="space-y-1">
                  {CALENDAR_CATEGORIES.map((cat) => {
                    const hidden = hiddenCats.has(cat.id);
                    const count  = events.filter((e) => (e.category ?? 'general') === cat.id).length;
                    return (
                      <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                        className={cn('w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-all text-left',
                          hidden ? 'opacity-40 hover:opacity-70' : 'hover:bg-white/5')}>
                        <span className={cn('w-3 h-3 rounded-sm flex-shrink-0 border-2 transition-all',
                          hidden ? 'border-white/20 bg-transparent' : 'border-transparent')}
                          style={!hidden ? { background: cat.color } : {}}>
                          {!hidden && <span className="flex items-center justify-center text-[8px] font-black text-black leading-none">✓</span>}
                        </span>
                        <span className={cn('flex-1 font-medium', hidden ? 'text-white/30' : 'text-white/70')}>{cat.label}</span>
                        {count > 0 && <span className="text-[9px] text-white/25">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>

            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <PanelLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <NeonButton variant="ghost" size="sm" onClick={() => navigate('prev')} icon={<ChevronLeft className="w-4 h-4" />} />
              <NeonButton variant="ghost" size="sm" onClick={() => navigate('today')}>Today</NeonButton>
              <NeonButton variant="ghost" size="sm" onClick={() => navigate('next')} icon={<ChevronRight className="w-4 h-4" />} />
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[140px] relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events…"
                className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
              {VIEWS.map((v) => (
                <button key={v.value} onClick={() => setView(v.value)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    view === v.value ? 'text-white' : 'text-white/40 hover:text-white/60')}
                  style={view === v.value ? { background: `${theme.accentColor}20`, border: `1px solid ${theme.accentColor}30` } : {}}>
                  {v.icon}
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>

            <button onClick={() => exportICS(filteredEvents)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 border border-white/10 hover:border-white/20 hover:text-white/80 transition-all">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Search results banner */}
          {searchQuery && (
            <div className="text-xs text-white/40 px-1">
              {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </div>
          )}

          {/* Calendar grid */}
          <GlassCard padding="md">
            <AnimatePresence mode="wait">
              <motion.div key={`${view}-${searchQuery}-${currentDate.getTime()}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}>

                {/* If searching, always show agenda-style results */}
                {searchQuery ? (
                  <AgendaView events={filteredEvents} fromDate={new Date(0)} onEventClick={openDetail} accentColor={theme.accentColor} />
                ) : (
                  <>
                    {view === 'month' && (
                      <MonthView currentDate={currentDate} events={filteredEvents}
                        onDateClick={(d) => { setSelectedDate(d); setAddModalOpen(true); }}
                        onEventClick={openDetail} accentColor={theme.accentColor} />
                    )}
                    {view === 'week' && (
                      <WeekView currentDate={currentDate} events={filteredEvents}
                        onEventClick={openDetail} accentColor={theme.accentColor} />
                    )}
                    {view === 'day' && (
                      <DayView currentDate={currentDate} events={filteredEvents} onEventClick={openDetail} />
                    )}
                    {view === 'year' && (
                      <YearView currentDate={currentDate} events={filteredEvents}
                        onMonthClick={(d) => { setCurrentDate(d); setView('month'); }}
                        accentColor={theme.accentColor} />
                    )}
                    {view === 'agenda' && (
                      <AgendaView events={filteredEvents} fromDate={currentDate}
                        onEventClick={openDetail} accentColor={theme.accentColor} />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>

      {/* Modals */}
      <AddEventModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)}
        defaultDate={selectedDate ?? undefined} onAdd={addEvent} />

      {detailEvent && (
        <EventDetailModal event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onEdit={openEdit}
          onDelete={async (id) => { await removeEvent(id); setDetailEvent(null); }} />
      )}

      {editingEvent && (
        <EditEventModal event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={async (id, data) => { await editEvent(id, data); setEditingEvent(null); }} />
      )}
    </DashboardLayout>
  );
}
