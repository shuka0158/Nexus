'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Zap, CheckSquare, Calendar, Flame, Target, BookOpen, Clock, BarChart2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const STEPS = [
  {
    icon: Zap,
    title: 'Welcome to NEXUS',
    body: 'Your all-in-one productivity hub. Plan your day, track habits, set goals, and stay on top of everything that matters.',
    color: '#00d4ff',
  },
  {
    icon: CheckSquare,
    title: 'Tasks & Kanban',
    body: 'Organize tasks in a drag-and-drop Kanban board. Add subtasks, set priorities, and use bulk actions to stay efficient.',
    color: '#22c55e',
  },
  {
    icon: Calendar,
    title: 'Calendar & Events',
    body: 'See your schedule at a glance. Create events, set reminders, and export your calendar as an ICS file.',
    color: '#a855f7',
  },
  {
    icon: Flame,
    title: 'Habit Tracker',
    body: 'Build daily habits and track your streak. The 7-day heatmap shows you at a glance how consistent you\'ve been.',
    color: '#f97316',
  },
  {
    icon: Target,
    title: 'Goals & Milestones',
    body: 'Set long-term goals with milestones and progress tracking. Break big dreams into actionable steps.',
    color: '#eab308',
  },
  {
    icon: Clock,
    title: 'Time Blocking',
    body: 'Plan your day hour by hour. Block time for deep work, meetings, and breaks so your schedule works for you.',
    color: '#8b5cf6',
  },
  {
    icon: BarChart2,
    title: 'Weekly Review',
    body: 'Every week, review what you accomplished. See task completion charts, habit consistency, and goal progress.',
    color: '#10b981',
  },
  {
    icon: Zap,
    title: 'Tip: Press ? anytime',
    body: 'Open the keyboard shortcuts overlay with ? to navigate NEXUS even faster. You\'re all set — let\'s build something great!',
    color: '#00d4ff',
  },
];

const STORAGE_KEY = 'nexus-onboarding-done';

export function OnboardingTour() {
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(8,8,20,0.98)', backdropFilter: 'blur(24px)' }}
          >
            <button onClick={dismiss} className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            {/* Icon area */}
            <div className="flex flex-col items-center px-8 pt-12 pb-8 text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: `${current.color}18`, border: `1px solid ${current.color}30` }}
              >
                <Icon className="w-10 h-10" style={{ color: current.color }} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
              <p className="text-white/55 leading-relaxed">{current.body}</p>
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 pb-6">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i === step ? current.color : 'rgba(255,255,255,0.15)',
                    width: i === step ? '20px' : '8px' }} />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors disabled:opacity-0"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: current.color }}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={dismiss}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: current.color }}
                >
                  Get started <Zap className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
