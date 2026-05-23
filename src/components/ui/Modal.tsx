'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sizeMap = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-lg',
    xl:   'max-w-2xl',
    full: 'max-w-5xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className={cn(
                'relative w-full rounded-2xl border border-white/10 shadow-2xl',
                'bg-dark-700/90 backdrop-blur-xl',
                sizeMap[size],
                className
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at top left, rgba(0,212,255,0.06) 0%, transparent 60%)',
                }}
              />
              {(title || subtitle) && (
                <div className="relative flex items-start justify-between p-6 pb-4 border-b border-white/8">
                  <div>
                    {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                    {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              <div className="relative p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
