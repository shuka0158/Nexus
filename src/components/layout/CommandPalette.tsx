'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search, LayoutDashboard, Calendar, CheckSquare, Bell, Settings, Timer, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { cn } from '@/lib/utils';
import { CommandPaletteItem } from '@/types';

export const CommandPalette: React.FC = () => {
  const router = useRouter();

  const items: CommandPaletteItem[] = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: 'dashboard', category: 'Navigation', action: () => router.push('/dashboard'), keywords: ['home', 'main'] },
    { id: 'calendar', label: 'Go to Calendar', icon: 'calendar', category: 'Navigation', action: () => router.push('/calendar'), keywords: ['events', 'schedule'] },
    { id: 'todos', label: 'Go to Tasks', icon: 'tasks', category: 'Navigation', action: () => router.push('/todos'), keywords: ['todo', 'kanban', 'tasks'] },
    { id: 'notifications', label: 'Go to Notifications', icon: 'bell', category: 'Navigation', action: () => router.push('/notifications') },
    { id: 'settings', label: 'Go to Settings', icon: 'settings', category: 'Navigation', action: () => router.push('/settings') },
    { id: 'pomodoro', label: 'Go to Focus Timer', icon: 'timer', category: 'Navigation', action: () => router.push('/pomodoro'), keywords: ['pomodoro', 'focus', 'timer'] },
    { id: 'theme', label: 'Open Theme Settings', icon: 'theme', category: 'Settings', action: () => router.push('/settings/appearance'), keywords: ['theme', 'color', 'dark', 'light'] },
    { id: 'profile', label: 'Open Profile Settings', icon: 'profile', category: 'Settings', action: () => router.push('/settings/profile'), keywords: ['profile', 'account', 'avatar'] },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    dashboard: <LayoutDashboard className="w-4 h-4" />,
    calendar:  <Calendar className="w-4 h-4" />,
    tasks:     <CheckSquare className="w-4 h-4" />,
    bell:      <Bell className="w-4 h-4" />,
    settings:  <Settings className="w-4 h-4" />,
    timer:     <Timer className="w-4 h-4" />,
    theme:     <Zap className="w-4 h-4" />,
    profile:   <Settings className="w-4 h-4" />,
  };

  const { isOpen, setIsOpen, query, setQuery, filtered, selected, setSelected, inputRef, handleKeyDown, execute } = useCommandPalette(items);

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CommandPaletteItem[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 flex items-start justify-center pt-24 z-50 px-4">
            <motion.div
              className="w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              style={{ background: 'rgba(10,10,25,0.95)', backdropFilter: 'blur(20px)' }}
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/30">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-white/30 text-sm">No results found</div>
                ) : (
                  Object.entries(grouped).map(([category, categoryItems]) => {
                    let globalIdx = filtered.indexOf(categoryItems[0]);
                    return (
                      <div key={category}>
                        <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                          {category}
                        </div>
                        {categoryItems.map((item) => {
                          const idx = filtered.indexOf(item);
                          const isSelected = selected === idx;
                          return (
                            <button
                              key={item.id}
                              onClick={() => execute(item)}
                              onMouseEnter={() => setSelected(idx)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left',
                                isSelected ? 'bg-white/8 text-white' : 'text-white/60 hover:text-white'
                              )}
                            >
                              <span className="text-white/40">
                                {item.icon ? iconMap[item.icon] : <Zap className="w-4 h-4" />}
                              </span>
                              <span className="text-sm">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2 border-t border-white/8 flex items-center gap-4 text-[10px] text-white/20">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
                <span className="ml-auto">⌘K Toggle</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
