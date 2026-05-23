'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, CheckCheck, Trash2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useNotifications } from '@/contexts/NotificationContext';
import { AppNotification } from '@/types';
import { cn, timeAgo, hexToRgba } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

const TYPE_CONFIG: Record<AppNotification['type'], { color: string; label: string; icon: string }> = {
  todo_reminder: { color: '#00d4ff', label: 'Task',        icon: '✅' },
  event_reminder: { color: '#a855f7', label: 'Calendar',   icon: '📅' },
  system:        { color: '#6b7280', label: 'System',      icon: '⚙️' },
  achievement:   { color: '#eab308', label: 'Achievement', icon: '🏆' },
  update:        { color: '#22c55e', label: 'Update',      icon: '🔄' },
  focus:         { color: '#ec4899', label: 'Focus',       icon: '🎯' },
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, requestPermission } = useNotifications();
  const { theme } = useTheme();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [requestingPermission, setRequestingPermission] = useState(false);

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    const granted = await requestPermission();
    if (granted) toast.success('Push notifications enabled!');
    else toast.error('Permission denied. Enable in browser settings.');
    setRequestingPermission(false);
  };

  return (
    <DashboardLayout title="Notifications" subtitle={`${unreadCount} unread`}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/8">
            {(['all','unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                  filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                )}
              >
                {f}
                {f === 'unread' && unreadCount > 0 && (
                  <span
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: theme.accentColor, color: '#000' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <NeonButton variant="secondary" size="sm" onClick={markAllRead} icon={<CheckCheck className="w-4 h-4" />}>
                Mark all read
              </NeonButton>
            )}
            <NeonButton
              variant="secondary"
              size="sm"
              loading={requestingPermission}
              onClick={handleRequestPermission}
              icon={<Bell className="w-4 h-4" />}
            >
              Enable Push
            </NeonButton>
          </div>
        </div>

        {/* Notifications list */}
        <GlassCard padding="none">
          {filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5">
                <BellOff className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/40 text-sm">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((notif, i) => {
                const config = TYPE_CONFIG[notif.type];
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => !notif.read && markRead(notif.id)}
                    className={cn(
                      'flex items-start gap-4 px-5 py-4 border-b border-white/5 last:border-0 transition-all cursor-pointer group',
                      !notif.read ? 'bg-white/3 hover:bg-white/5' : 'hover:bg-white/2'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: hexToRgba(config.color, 0.15) }}
                    >
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={cn('text-sm font-medium', notif.read ? 'text-white/60' : 'text-white')}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">{notif.body}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notif.read && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: config.color, boxShadow: `0 0 6px ${config.color}` }}
                            />
                          )}
                          <span className="text-[10px] text-white/25 whitespace-nowrap">
                            {timeAgo(notif.createdAt.toDate())}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: hexToRgba(config.color, 0.15), color: config.color }}
                        >
                          {config.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions on hover */}
                    {!notif.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
