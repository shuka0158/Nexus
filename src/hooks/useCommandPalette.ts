'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CommandPaletteItem } from '@/types';

export const useCommandPalette = (items: CommandPaletteItem[]) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? items.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      })
    : items;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((o) => !o);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery('');
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      filtered[selected].action();
      setIsOpen(false);
    }
  }, [filtered, selected]);

  const execute = useCallback((item: CommandPaletteItem) => {
    item.action();
    setIsOpen(false);
  }, []);

  return {
    isOpen, setIsOpen,
    query, setQuery,
    filtered, selected, setSelected,
    inputRef,
    handleKeyDown,
    execute,
  };
};
