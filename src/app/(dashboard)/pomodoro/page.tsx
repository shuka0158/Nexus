'use client';

import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTheme } from '@/contexts/ThemeContext';
import { cn, hexToRgba } from '@/lib/utils';

const PHASE_LABELS = {
  work:        { label: 'Focus',       color: '#00d4ff' },
  short_break: { label: 'Short Break', color: '#22c55e' },
  long_break:  { label: 'Long Break',  color: '#a855f7' },
};

export default function PomodoroPage() {
  const { theme } = useTheme();
  const settings = {
    workDuration:              25,
    shortBreakDuration:        5,
    longBreakDuration:         15,
    sessionsBeforeLongBreak:   4,
    autoStartBreaks:           false,
    autoStartPomodoros:        false,
    soundEnabled:              true,
    notifyOnComplete:          true,
  };
  const { phase, display, progress, isRunning, sessionCount, totalWorkMinutes, start, pause, reset, skip } = usePomodoro(settings);

  const phaseConfig = PHASE_LABELS[phase];
  const circumference = 2 * Math.PI * 120;

  return (
    <DashboardLayout title="Focus Timer" subtitle="Pomodoro technique for deep work">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main timer card */}
        <GlassCard padding="lg" className="flex flex-col items-center gap-8 py-12">
          {/* Phase label */}
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2 rounded-full text-sm font-semibold tracking-wider uppercase"
            style={{
              background: hexToRgba(phaseConfig.color, 0.15),
              color: phaseConfig.color,
              border: `1px solid ${hexToRgba(phaseConfig.color, 0.3)}`,
            }}
          >
            {phaseConfig.label}
          </motion.div>

          {/* SVG Ring Timer */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" width="256" height="256">
              {/* Track */}
              <circle
                cx="128" cy="128" r="120"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              {/* Progress */}
              <motion.circle
                cx="128" cy="128" r="120"
                fill="none"
                stroke={phaseConfig.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{
                  filter: `drop-shadow(0 0 8px ${phaseConfig.color}80)`,
                }}
                transition={{ duration: 0.5 }}
              />
            </svg>

            {/* Time display */}
            <div className="relative z-10 text-center">
              <motion.p
                key={display}
                className="text-6xl font-bold text-white font-mono tabular-nums"
                animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
                transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
              >
                {display}
              </motion.p>
              <p className="text-white/30 text-sm mt-2">
                Session {sessionCount + 1}
              </p>
            </div>

            {/* Glow */}
            {isRunning && (
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ background: `radial-gradient(circle, ${hexToRgba(phaseConfig.color, 0.1)} 0%, transparent 70%)` }}
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 w-full">
            <NeonButton variant="ghost" size="md" onClick={reset} icon={<RotateCcw className="w-4 h-4" />} />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRunning ? pause : start}
              className="w-16 h-16 rounded-full flex items-center justify-center text-black font-bold"
              style={{
                background: `linear-gradient(135deg, ${phaseConfig.color}, ${hexToRgba(phaseConfig.color, 0.7)})`,
                boxShadow: `0 0 30px ${hexToRgba(phaseConfig.color, 0.4)}`,
              }}
            >
              {isRunning
                ? <Pause className="w-6 h-6" />
                : <Play className="w-6 h-6 ml-1" />
              }
            </motion.button>
            <NeonButton variant="ghost" size="md" onClick={skip} icon={<SkipForward className="w-4 h-4" />} />
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Sessions Today', value: sessionCount, color: '#00d4ff' },
            { label: 'Focus Minutes',  value: totalWorkMinutes, color: '#a855f7' },
            { label: 'Until Break',    value: `${4 - (sessionCount % 4)}`, color: '#22c55e' },
          ].map((stat) => (
            <GlassCard key={stat.label} padding="md" className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 mt-1">{stat.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Session dots */}
        <GlassCard padding="md">
          <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">Today&apos;s Progress</p>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full transition-all"
                style={{
                  background: i < sessionCount
                    ? phaseConfig.color
                    : 'rgba(255,255,255,0.1)',
                  boxShadow: i < sessionCount ? `0 0 8px ${phaseConfig.color}60` : 'none',
                }}
              />
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
