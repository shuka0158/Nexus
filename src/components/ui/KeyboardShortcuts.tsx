'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['G', 'D'], desc: 'Go to Dashboard' },
    { keys: ['G', 'C'], desc: 'Go to Calendar' },
    { keys: ['G', 'T'], desc: 'Go to Tasks' },
    { keys: ['G', 'H'], desc: 'Go to Habits' },
    { keys: ['G', 'N'], desc: 'Go to Notes' },
    { keys: ['G', 'G'], desc: 'Go to Goals' },
  ]},
  { category: 'Tasks', items: [
    { keys: ['N'], desc: 'New task' },
    { keys: ['Ctrl', 'Enter'], desc: 'Save task' },
    { keys: ['Esc'], desc: 'Close modal' },
  ]},
  { category: 'Calendar', items: [
    { keys: ['E'], desc: 'New event' },
    { keys: ['←'], desc: 'Previous period' },
    { keys: ['→'], desc: 'Next period' },
    { keys: ['T'], desc: 'Go to today' },
  ]},
  { category: 'General', items: [
    { keys: ['/'], desc: 'Open AI chat (quick capture)' },
    { keys: ['Space'], desc: 'Open AI chat (quick capture)' },
    { keys: ['?'], desc: 'Show shortcuts' },
    { keys: ['Ctrl', 'K'], desc: 'Command palette' },
  ]},
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-xl rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(8,8,20,0.98)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-white/50" />
                <p className="font-semibold text-white">Keyboard Shortcuts</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              {SHORTCUTS.map(section => (
                <div key={section.category}>
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">{section.category}</p>
                  <div className="space-y-2">
                    {section.items.map(item => (
                      <div key={item.desc} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-white/60">{item.desc}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {item.keys.map((k, i) => (
                            <kbd key={i} className="px-2 py-0.5 rounded-md text-xs font-medium bg-white/8 border border-white/15 text-white/70">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-white/8 text-center">
              <p className="text-xs text-white/25">Press <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-white/8 border border-white/15">?</kbd> to toggle this overlay</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
