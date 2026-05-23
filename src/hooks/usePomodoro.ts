'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PomodoroSettings } from '@/types';

type Phase = 'work' | 'short_break' | 'long_break';

interface PomodoroState {
  phase: Phase;
  timeLeft: number;
  isRunning: boolean;
  sessionCount: number;
  totalWorkMinutes: number;
}

export const usePomodoro = (settings: PomodoroSettings) => {
  const phaseDuration = (phase: Phase) => {
    if (phase === 'work') return settings.workDuration * 60;
    if (phase === 'short_break') return settings.shortBreakDuration * 60;
    return settings.longBreakDuration * 60;
  };

  const [state, setState] = useState<PomodoroState>({
    phase: 'work',
    timeLeft: settings.workDuration * 60,
    isRunning: false,
    sessionCount: 0,
    totalWorkMinutes: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    if (!settings.soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [settings.soundEnabled]);

  const nextPhase = useCallback(() => {
    setState((prev) => {
      const newSessionCount = prev.phase === 'work' ? prev.sessionCount + 1 : prev.sessionCount;
      let nextPhase: Phase = 'work';
      if (prev.phase === 'work') {
        nextPhase = newSessionCount % settings.sessionsBeforeLongBreak === 0
          ? 'long_break'
          : 'short_break';
      }
      return {
        ...prev,
        phase: nextPhase,
        timeLeft: phaseDuration(nextPhase),
        sessionCount: newSessionCount,
        totalWorkMinutes: prev.phase === 'work'
          ? prev.totalWorkMinutes + settings.workDuration
          : prev.totalWorkMinutes,
        isRunning: prev.phase === 'work'
          ? settings.autoStartBreaks
          : settings.autoStartPomodoros,
      };
    });
    playBeep();
  }, [settings, playBeep]);

  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.timeLeft <= 1) {
            clearInterval(intervalRef.current!);
            nextPhase();
            return prev;
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.isRunning, nextPhase]);

  const start  = useCallback(() => setState((p) => ({ ...p, isRunning: true })), []);
  const pause  = useCallback(() => setState((p) => ({ ...p, isRunning: false })), []);
  const reset  = useCallback(() => setState((p) => ({ ...p, isRunning: false, timeLeft: phaseDuration(p.phase) })), []);
  const skip   = useCallback(() => { setState((p) => ({ ...p, isRunning: false })); nextPhase(); }, [nextPhase]);

  const progress = 1 - state.timeLeft / phaseDuration(state.phase);
  const minutes = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
  const seconds = (state.timeLeft % 60).toString().padStart(2, '0');

  return { ...state, progress, display: `${minutes}:${seconds}`, start, pause, reset, skip };
};
