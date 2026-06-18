'use client';

import { forwardRef } from 'react';
import { CheckSquare, Calendar, Flame, Timer, Zap } from 'lucide-react';
import { format } from 'date-fns';

export interface RecapData {
  start: Date;
  end: Date;
  tasksCompleted: number;
  eventsAttended: number;
  habitsKept: number;     // total completion-days across all habits
  focusMinutes: number;   // total pomodoro work-minutes
  longestStreak: number;  // best habit streak
  topTaskTitle: string | null;
}

interface Props {
  data: RecapData;
  accent: string;
  userName: string;
}

// Square card, intentionally fixed pixel dimensions so PNG export is predictable.
// Tailwind is still applied; html-to-image inlines the computed styles.
export const WeeklyRecapCard = forwardRef<HTMLDivElement, Props>(
  ({ data, accent, userName }, ref) => {
    const range = `${format(data.start, 'MMM d')} – ${format(data.end, 'MMM d, yyyy')}`;
    const focusH = Math.floor(data.focusMinutes / 60);
    const focusM = data.focusMinutes % 60;

    return (
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{
          width: 1080,
          height: 1080,
          background: '#000000',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Soft gradient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 25% 20%, ${accent}22 0%, transparent 60%), radial-gradient(circle at 80% 80%, ${accent}14 0%, transparent 55%)`,
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative h-full flex flex-col p-16">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl text-white/50 tracking-wide">{range}</p>
              <p className="mt-2 text-5xl font-bold tracking-tight">
                {userName.split(' ')[0] || 'My'}&apos;s week
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: '#ffffff' }}
              >
                <Zap className="w-7 h-7 text-black" />
              </div>
              <p className="text-3xl font-bold tracking-[0.3em]">NEXUS</p>
            </div>
          </div>

          {/* Big number — headline stat */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <p
              className="text-[260px] leading-none font-black tabular-nums"
              style={{ color: accent }}
            >
              {data.tasksCompleted}
            </p>
            <p className="-mt-4 text-3xl text-white/70 font-medium">
              {data.tasksCompleted === 1 ? 'task done' : 'tasks done'}
            </p>
            {data.topTaskTitle && (
              <p className="mt-6 text-xl text-white/40 italic max-w-[80%] text-center truncate">
                &ldquo;{data.topTaskTitle}&rdquo;
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-6">
            <Stat icon={<Timer className="w-7 h-7" />} value={focusH > 0 ? `${focusH}h ${focusM}m` : `${focusM}m`} label="focus time" accent={accent} />
            <Stat icon={<Calendar className="w-7 h-7" />} value={String(data.eventsAttended)} label={data.eventsAttended === 1 ? 'event' : 'events'} accent={accent} />
            <Stat icon={<Flame className="w-7 h-7" />} value={String(data.habitsKept)} label={data.habitsKept === 1 ? 'habit day' : 'habit days'} accent={accent} />
            <Stat icon={<CheckSquare className="w-7 h-7" />} value={String(data.longestStreak)} label="day streak" accent={accent} />
          </div>

          {/* Footer */}
          <div className="mt-12 flex items-center justify-between text-white/40">
            <p className="text-lg">Made with NEXUS</p>
            <p className="text-lg font-mono">nexus-future.web.app</p>
          </div>
        </div>
      </div>
    );
  },
);

WeeklyRecapCard.displayName = 'WeeklyRecapCard';

const Stat: React.FC<{ icon: React.ReactNode; value: string; label: string; accent: string }> = ({ icon, value, label, accent }) => (
  <div
    className="rounded-2xl p-5 flex flex-col gap-2"
    style={{ background: '#0d0d0d', border: `1px solid ${accent}30` }}
  >
    <div style={{ color: accent }}>{icon}</div>
    <p className="text-4xl font-bold tabular-nums tracking-tight">{value}</p>
    <p className="text-base text-white/50 uppercase tracking-wider">{label}</p>
  </div>
);
