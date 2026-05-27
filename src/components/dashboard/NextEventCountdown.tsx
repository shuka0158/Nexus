'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { CalendarEvent } from '@/types';

interface NextEventCountdownProps {
  events: CalendarEvent[];
  accentColor: string;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return 'Starting now';
  const totalMin = Math.round(diffMs / 60_000);
  if (totalMin < 60) return `in ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m ? `in ${h}h ${m}m` : `in ${h}h`;
  const d = Math.floor(h / 24);
  return `in ${d} day${d !== 1 ? 's' : ''}`;
}

function formatExactTime(date: Date): string {
  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();
  if (sameDay) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export const NextEventCountdown: React.FC<NextEventCountdownProps> = ({ events, accentColor }) => {
  const [tick, setTick] = useState(0);

  // Re-render every 30 s so the countdown stays current
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const next = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.startDate.toMillis() > now - 60_000) // include events starting within the last minute
      .sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis())[0] ?? null;
    // tick is intentionally referenced via the useEffect, not here
  }, [events, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!next) {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/8">
        <Clock className="w-4 h-4 text-white/30 flex-shrink-0" />
        <p className="text-xs text-white/40">Nothing on the schedule. Clear mind.</p>
      </div>
    );
  }

  const startDate = next.startDate.toDate();
  const diff = startDate.getTime() - Date.now();
  const countdown = formatCountdown(diff);
  const isImminent = diff > 0 && diff < 15 * 60_000; // < 15 min
  const isStarting = diff <= 60_000 && diff > -60_000;

  return (
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/8">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: isImminent ? `${accentColor}30` : `${accentColor}18`,
          border: `1px solid ${accentColor}40`,
        }}
      >
        <Clock className="w-4 h-4" style={{ color: accentColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Next up</p>
        <p className="text-sm font-semibold text-white truncate">{next.title}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className="text-sm font-bold tabular-nums"
          style={{ color: isStarting ? '#22c55e' : isImminent ? accentColor : '#ffffff' }}
        >
          {countdown}
        </p>
        <p className="text-[10px] text-white/40">{formatExactTime(startDate)}</p>
      </div>
    </div>
  );
};
