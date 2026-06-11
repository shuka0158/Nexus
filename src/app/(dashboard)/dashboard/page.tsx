'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Calendar, Zap, Target, TrendingUp, Clock, Cloud, Sun, CloudRain, CloudSnow, Wind, Quote, Sparkles, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfDay } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { useTodos } from '@/hooks/useTodos';
import { useCalendar } from '@/hooks/useCalendar';
import { NextEventCountdown } from '@/components/dashboard/NextEventCountdown';
import { DailyCheckin } from '@/components/dashboard/DailyCheckin';
import { useTheme } from '@/contexts/ThemeContext';

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Productivity is being able to do things that you were never able to do before.", author: "Franz Kafka" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
];

function getWeatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code <= 3) return Cloud;
  if (code <= 67) return CloudRain;
  if (code <= 77) return CloudSnow;
  return Wind;
}

function getWeatherDesc(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 49) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  return 'Stormy';
}

interface WeatherData { temp: number; code: number; city: string }

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
        );
        const d = await r.json();
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
        );
        const gd = await geo.json();
        setWeather({
          temp: Math.round(d.current_weather.temperature),
          code: d.current_weather.weathercode,
          city: gd.address?.city || gd.address?.town || gd.address?.village || 'Your city',
        });
      } catch { /* weather is optional */ }
    }, () => {});
  }, []);
  return weather;
}

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { todos, stats } = useTodos();
  const { upcomingEvents } = useCalendar();
  const { theme } = useTheme();
  const router = useRouter();

  const activityData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = todos.filter((t) =>
        t.completedAt &&
        t.completedAt.toDate() >= dayStart &&
        t.completedAt.toDate() < dayEnd
      ).length;
      return { date: format(date, 'MMM d'), count };
    });
  }, [todos]);

  const completionByLabel = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    todos.forEach((t) => {
      t.labels.forEach((l) => {
        if (!map[l]) map[l] = { total: 0, done: 0 };
        map[l].total++;
        if (t.status === 'done') map[l].done++;
      });
    });
    return Object.entries(map).map(([label, { total, done }]) => ({
      label,
      rate: total > 0 ? Math.round((done / total) * 100) : 0,
    })).slice(0, 4);
  }, [todos]);

  const greeting = `${greetingByHour()}, ${user?.displayName?.split(' ')[0] ?? 'there'}`;
  const weather = useWeather();
  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);
  const isEmpty = stats.total === 0 && upcomingEvents.length === 0;

  return (
    <DashboardLayout title="Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Daily check-in — visible if not done yet, otherwise shows today's journal */}
        {user && <DailyCheckin userId={user.uid} accentColor={theme.accentColor} />}

        {/* First-run onboarding (only when there's no data yet) */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-5 sm:p-6 border border-[#333333]"
            style={{
              background: `linear-gradient(135deg, ${theme.accentColor}10 0%, ${theme.secondaryColor}06 100%)`,
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${theme.accentColor}20`, border: `1px solid ${theme.accentColor}40` }}>
                <Sparkles className="w-5 h-5" style={{ color: theme.accentColor }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white">Welcome to NEXUS</h3>
                <p className="text-xs sm:text-sm text-white/50 mt-0.5">Start by capturing what&apos;s on your mind — fastest way is the AI chat.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#333333] hover:border-white hover:bg-[#111111] transition-all text-left"
                title="Press / to open"
              >
                <span className="w-7 h-7 rounded-md bg-[#1a1a1a] flex items-center justify-center text-[10px] text-white font-mono">/</span>
                <span className="text-sm text-white">Open the AI chat — try a brain dump</span>
              </button>
              <button
                onClick={() => router.push('/calendar')}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#333333] hover:border-white hover:bg-[#111111] transition-all text-left"
              >
                <Calendar className="w-5 h-5 text-white/60" />
                <span className="text-sm text-white">Add your first calendar event</span>
              </button>
              <button
                onClick={() => router.push('/todos')}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#333333] hover:border-white hover:bg-[#111111] transition-all text-left"
              >
                <CheckSquare className="w-5 h-5 text-white/60" />
                <span className="text-sm text-white">Capture a task</span>
              </button>
              <button
                onClick={() => router.push('/settings?tab=integrations')}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#333333] hover:border-white hover:bg-[#111111] transition-all text-left"
              >
                <Link2 className="w-5 h-5 text-white/60" />
                <span className="text-sm text-white">Connect Google Calendar</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden p-4 sm:p-6"
          style={{
            background: `linear-gradient(135deg, ${theme.accentColor}20 0%, ${theme.secondaryColor}15 100%)`,
            border: `1px solid ${theme.accentColor}30`,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at top right, ${theme.accentColor}15 0%, transparent 60%)`,
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-xl font-semibold text-white truncate">{greeting} 👋</h2>
                <p className="text-white/50 text-xs sm:text-sm mt-1">
                  <span className="text-white font-medium">{stats.inProgress}</span> tasks in progress
                  {' · '}<span className="text-white font-medium">{upcomingEvents.length}</span> upcoming events
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <div
                  className="px-3 py-1.5 rounded-xl text-sm font-medium"
                  style={{
                    background: `${theme.accentColor}20`,
                    color: theme.accentColor,
                    border: `1px solid ${theme.accentColor}30`,
                  }}
                >
                  {stats.completionRate}% complete
                </div>
              </div>
            </div>
            <NextEventCountdown events={upcomingEvents} accentColor={theme.accentColor} />
          </div>
        </motion.div>

        {/* Weather + Quote row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Weather widget */}
          {weather && (() => {
            const WeatherIcon = getWeatherIcon(weather.code);
            return (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: `linear-gradient(135deg, ${theme.accentColor}15, ${theme.secondaryColor}10)`, border: `1px solid ${theme.accentColor}20` }}>
                <WeatherIcon className="w-10 h-10 flex-shrink-0" style={{ color: theme.accentColor }} />
                <div>
                  <p className="text-2xl font-bold text-white">{weather.temp}°C</p>
                  <p className="text-sm text-white/50">{getWeatherDesc(weather.code)} · {weather.city}</p>
                </div>
              </motion.div>
            );
          })()}

          {/* Quote of the day */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-4"
            style={{ background: `linear-gradient(135deg, ${theme.secondaryColor}15, ${theme.accentColor}10)`, border: `1px solid ${theme.secondaryColor}20` }}>
            <div className="flex items-start gap-2">
              <Quote className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: theme.secondaryColor }} />
              <div>
                <p className="text-sm text-white/80 leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
                <p className="text-xs text-white/40 mt-1">— {quote.author}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Tasks"
            value={stats.total}
            subtitle={`${stats.completed} completed`}
            icon={<CheckSquare className="w-5 h-5" />}
            color="#00d4ff"
            delay={0}
          />
          <StatsCard
            title="In Progress"
            value={stats.inProgress}
            icon={<Zap className="w-5 h-5" />}
            color="#a855f7"
            delay={0.07}
          />
          <StatsCard
            title="Upcoming Events"
            value={upcomingEvents.length}
            icon={<Calendar className="w-5 h-5" />}
            color="#22c55e"
            delay={0.14}
          />
          <StatsCard
            title="Overdue"
            value={stats.overdue}
            icon={<Clock className="w-5 h-5" />}
            color={stats.overdue > 0 ? '#ef4444' : '#6b7280'}
            delay={0.21}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ActivityChart data={activityData} />
          </div>

          {/* Completion by label */}
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">By Label</h3>
              <Target className="w-4 h-4 text-white/30" />
            </div>
            {completionByLabel.length === 0 ? (
              <div className="py-8 text-center text-white/30 text-sm">No labels yet</div>
            ) : (
              <div className="space-y-3">
                {completionByLabel.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/60 capitalize">{item.label}</span>
                      <span className="text-white/40">{item.rate}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.secondaryColor})` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.rate}%` }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UpcomingEvents events={upcomingEvents} />
          <RecentTasks todos={todos} />
        </div>
      </div>
    </DashboardLayout>
  );
}
