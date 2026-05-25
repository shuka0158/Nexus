'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, CheckSquare, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut, Timer, Zap, User,
  BookOpen, Target, Flame, BarChart2, Clock, Users, Smartphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calendar',      icon: Calendar,        label: 'Calendar' },
  { href: '/todos',         icon: CheckSquare,     label: 'Tasks' },
  { href: '/habits',        icon: Flame,           label: 'Habits' },
  { href: '/goals',         icon: Target,          label: 'Goals' },
  { href: '/notes',         icon: BookOpen,        label: 'Notes' },
  { href: '/time-blocking', icon: Clock,           label: 'Time Blocks' },
  { href: '/weekly-review', icon: BarChart2,       label: 'Weekly Review' },
  { href: '/shared',        icon: Users,           label: 'Shared' },
  { href: '/notifications', icon: Bell,            label: 'Notifications' },
  { href: '/pomodoro',      icon: Timer,           label: 'Focus' },
  { href: '/settings',      icon: Settings,        label: 'Settings' },
];

const isCapacitor = typeof window !== 'undefined' && !!(window as { Capacitor?: unknown }).Capacitor;

export const Sidebar: React.FC = () => {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuth();
  const { theme, updateTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [collapsed, setCollapsed] = useState(isCapacitor ? true : theme.sidebarCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track mobile viewport (Tailwind md breakpoint = 768px)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Listen for hamburger toggle from Header
  useEffect(() => {
    const handler = () => setMobileOpen((v) => !v);
    window.addEventListener('toggle-sidebar', handler);
    return () => window.removeEventListener('toggle-sidebar', handler);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Body scroll lock + ESC to close while drawer is open
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobile, mobileOpen]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    updateTheme({ sidebarCollapsed: next });
  };

  const handleLogout = async () => {
    try { await logout(); router.push('/login'); toast.success('Signed out'); }
    catch { toast.error('Sign out failed'); }
  };

  // On mobile, sidebar is full-width drawer with labels always visible
  const effCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = isMobile ? 280 : (collapsed ? 56 : 220);
  const sidebarTranslate = isMobile && !mobileOpen ? '-100%' : '0%';

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md md:hidden"
          />
        )}
      </AnimatePresence>

    <motion.aside
      className="fixed left-0 top-0 h-full z-50 flex flex-col"
      animate={{ width: sidebarWidth, x: sidebarTranslate }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{ background: '#000000', borderRight: '1px solid #333333', paddingTop: 'env(safe-area-inset-top, 0)', paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-[#333333] flex-shrink-0">
        <AnimatePresence mode="wait">
          {!effCollapsed ? (
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 mr-auto min-w-0">
              <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-white">
                <Zap className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="font-bold text-white text-sm tracking-widest">NEXUS</span>
            </motion.div>
          ) : (
            <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-white">
                <Zap className="w-3.5 h-3.5 text-black" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!effCollapsed && (
          <button onClick={toggleCollapse} className="text-[#555555] hover:text-white transition-colors p-1 rounded hover:bg-[#1a1a1a] flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {effCollapsed && !isMobile && (
        <button onClick={toggleCollapse} className="mx-auto mt-2 text-[#555555] hover:text-white transition-colors p-1.5 rounded hover:bg-[#1a1a1a]">
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-0.5 px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active     = pathname === href || pathname.startsWith(href + '/');
          const notifBadge = href === '/notifications' && unreadCount > 0;
          return (
            <motion.button
              key={href}
              onClick={() => router.push(href)}
              className={cn(
                'relative w-full flex items-center rounded transition-colors duration-100 group',
                effCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2',
                active ? 'bg-white text-black' : 'text-[#888888] hover:bg-[#1a1a1a] hover:text-white'
              )}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-4 h-4" />
                {notifBadge && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white bg-[#cf222e]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {!effCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {effCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium text-white bg-[#111111] border border-[#444444] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {label}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Download app */}
      <div className="px-2 pb-2">
        <a href="/nexus-app.bin" download="NEXUS.apk"
          className={cn(
            'flex items-center rounded transition-colors border border-[#333333] text-[#888888] hover:text-white hover:border-white',
            effCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'
          )}
          title="Download Android App">
          <Smartphone className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!effCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xs font-medium whitespace-nowrap overflow-hidden">
                Download App
              </motion.span>
            )}
          </AnimatePresence>
        </a>
      </div>

      {/* User */}
      <div className="p-2 border-t border-[#333333] space-y-1">
        <motion.button
          onClick={() => router.push('/settings/profile')}
          className={cn('w-full flex items-center rounded transition-colors hover:bg-[#1a1a1a]',
            effCollapsed ? 'justify-center p-1.5' : 'gap-2.5 px-2 py-1.5')}
          whileTap={{ scale: 0.98 }}>
          <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden border border-[#444444]" style={{ background: '#1a1a1a' }}>
            {user?.photoURL
              ? <Image src={user.photoURL} alt="Avatar" width={28} height={28} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><User className="w-3.5 h-3.5 text-[#888888]" /></div>}
          </div>
          <AnimatePresence>
            {!effCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden text-left">
                <p className="text-sm font-medium text-white truncate">{user?.displayName ?? 'User'}</p>
                <p className="text-xs text-[#666666] truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <button
          onClick={handleLogout}
          className={cn('w-full flex items-center text-[#666666] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors',
            effCollapsed ? 'justify-center p-1.5' : 'gap-2.5 px-2 py-1.5')}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!effCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
    </>
  );
};
