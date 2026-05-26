'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar, CheckSquare, Flame, Target, BookOpen, Timer,
  Sparkles, Bell, Smartphone, Zap, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const FEATURES = [
  { icon: Calendar,    title: 'Smart Calendar',    desc: 'Month, week, day, year & agenda views with drag-and-drop events, recurring schedules and multiple reminders. Syncs with multiple Google accounts.' },
  { icon: CheckSquare, title: 'Tasks & Kanban',    desc: 'Capture todos as a list or a kanban board with priorities, labels, subtasks and due dates.' },
  { icon: Flame,       title: 'Habits',            desc: 'Track daily and weekly habits with streaks, completion grids and reminders.' },
  { icon: Target,      title: 'Goals',             desc: 'Set long-term goals with milestones, progress tracking and target dates.' },
  { icon: BookOpen,    title: 'Notes',             desc: 'Markdown-friendly notes with tags, colors and pinning. Great for daily journaling.' },
  { icon: Timer,       title: 'Pomodoro Focus',    desc: 'Built-in focus timer with custom intervals, session history and break automation.' },
  { icon: Sparkles,    title: 'AI Assistant',      desc: 'Create events and tasks from natural language. Ask what is on your schedule. Look up events by name.' },
  { icon: Bell,        title: 'Reminders',         desc: 'Browser push notifications for events and tasks — even when the tab is closed.' },
  { icon: Smartphone,  title: 'Installable PWA',   desc: 'Works offline and installs to your phone or desktop home screen like a native app.' },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users straight to their dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <main className="min-h-screen text-white" style={{ background: '#000000' }}>
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-[#222222]" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-white">
              <Zap className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-base tracking-widest">NEXUS</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm text-[#aaaaaa] hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="px-3 py-1.5 text-sm font-semibold bg-white text-black rounded hover:bg-[#e0e0e0] transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pt-16 sm:pt-24 pb-12 sm:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
            Your entire productivity stack, in one tab.
          </h1>
          <p className="text-base sm:text-lg text-[#aaaaaa] max-w-2xl mx-auto leading-relaxed mb-8">
            NEXUS combines a calendar, tasks, habits, goals, notes, pomodoro and an AI assistant into a single dark-mode app.
            Free, installable as a PWA, syncs with multiple Google accounts.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-white text-black font-semibold hover:bg-[#e0e0e0] transition-colors">
              Create an account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-[#444444] text-white hover:border-white transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-12 sm:py-16 border-t border-[#222222]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Everything you need to stay on top of life</h2>
          <p className="text-sm text-[#888888] text-center max-w-2xl mx-auto mb-10">
            Nine integrated modules. No add-ons, no paywalls, no signup wall on the marketing page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="p-5 rounded-xl border border-[#222222] bg-[#0a0a0a] hover:border-[#444444] transition-colors">
                <Icon className="w-6 h-6 text-white mb-3" strokeWidth={1.6} />
                <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-[#888888] leading-relaxed">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="px-5 py-12 sm:py-16 border-t border-[#222222]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">Why NEXUS?</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-white mb-1">Truly free</h3>
              <p className="text-sm text-[#888888] leading-relaxed">No paid tier, no premium features locked behind a wall. Everything works for everyone.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Multi-account Google Calendar</h3>
              <p className="text-sm text-[#888888] leading-relaxed">Connect your work email, personal email, family calendar — see and manage every event in one view, like Samsung Calendar.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Natural-language AI</h3>
              <p className="text-sm text-[#888888] leading-relaxed">&ldquo;Team meeting on Friday at 3pm, remind me 15 minutes before&rdquo; — the AI creates the event with the right reminder. Ask &ldquo;when is X?&rdquo; to find anything by name.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Real offline support</h3>
              <p className="text-sm text-[#888888] leading-relaxed">Install as a PWA on your phone or computer. Works without a connection; syncs when you&apos;re back online.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Open source</h3>
              <p className="text-sm text-[#888888] leading-relaxed">
                Source code on <a href="https://github.com/shuka0158/Nexus" className="text-white underline hover:no-underline">GitHub</a> under the MIT license.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-16 sm:py-24 border-t border-[#222222] text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Start organizing today.</h2>
        <p className="text-sm text-[#888888] mb-6">Takes ten seconds to sign up. No credit card.</p>
        <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded bg-white text-black font-semibold hover:bg-[#e0e0e0] transition-colors">
          Create your free account <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-5 py-6 border-t border-[#222222] text-xs text-[#666666]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 NEXUS · MIT licensed</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/shuka0158/Nexus" className="hover:text-white transition-colors">GitHub</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-white transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
