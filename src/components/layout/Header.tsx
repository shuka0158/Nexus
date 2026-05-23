'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { format } from 'date-fns';

interface HeaderProps { title: string; subtitle?: string; }

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const router = useRouter();
  const { theme, updateTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const toggleColorMode = () =>
    updateTheme({ colorMode: theme.colorMode === 'dark' ? 'light' : 'dark' });

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between h-14 px-5 flex-shrink-0"
      style={{ background: '#000000', borderBottom: '1px solid #333333' }}
    >
      <motion.div key={title} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        <h1 className="text-sm font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-[#666666] mt-0.5 truncate max-w-xs">{subtitle}</p>}
      </motion.div>

      <div className="flex items-center gap-1">
        {/* Clock */}
        <div className="hidden md:flex flex-col items-end mr-3">
          <span className="text-xs font-mono font-medium text-[#aaaaaa]">{format(new Date(), 'HH:mm')}</span>
          <span className="text-[10px] text-[#555555]">{format(new Date(), 'MMM d, yyyy')}</span>
        </div>

        {/* Command palette */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded border border-[#333333] bg-[#000000] text-[#666666] hover:text-white hover:border-[#666666] transition-colors text-xs"
        >
          <span>Search…</span>
          <kbd className="text-[10px] px-1 py-0.5 rounded bg-[#1a1a1a] border border-[#444444] text-[#666666] font-mono">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 rounded text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white bg-white"
              style={{ color: '#000000' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </button>

        {/* GitHub */}
        <a href="https://github.com/shuka0158" target="_blank" rel="noopener noreferrer"
          className="p-2 rounded text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="GitHub">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.337 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        </a>

        {/* Dark/Light toggle */}
        <button onClick={toggleColorMode}
          className="p-2 rounded text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors">
          <AnimatePresence mode="wait">
            {theme.colorMode === 'dark'
              ? <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><Sun className="w-4 h-4" /></motion.div>
              : <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Moon className="w-4 h-4" /></motion.div>}
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
};
