'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

const isCapacitor = typeof window !== 'undefined' && !!(window as { Capacitor?: unknown }).Capacitor;
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileTabBar } from './MobileTabBar';
import { CommandPalette } from './CommandPalette';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { NexusAIChat } from '@/components/ai/NexusAIChat';
import { ReminderScheduler } from '@/components/ReminderScheduler';
import { KeyboardShortcuts } from '@/components/ui/KeyboardShortcuts';
import { OnboardingTour } from '@/components/ui/OnboardingTour';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter:   { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
  const { theme } = useTheme();

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#000000', color: '#ffffff' }}>

      {/* Background effects */}
      {theme.backgroundType === 'particles' && <ParticleBackground />}

      {theme.backgroundType === 'grid' && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />
      )}

      {theme.backgroundType === 'gradient' && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 60%)
          `,
        }} />
      )}

      {theme.backgroundType === 'mesh' && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: `
            radial-gradient(at 20% 20%, rgba(255,255,255,0.04) 0px, transparent 50%),
            radial-gradient(at 80% 80%, rgba(255,255,255,0.03) 0px, transparent 50%),
            radial-gradient(at 50% 50%, rgba(255,255,255,0.02) 0px, transparent 50%)
          `,
        }} />
      )}

      {theme.scanlines && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }} />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content — no left padding on mobile (sidebar is a drawer overlay) */}
      <div
        className={cn(
          'relative z-10 flex flex-col min-h-screen transition-[padding] duration-300',
          theme.sidebarCollapsed ? 'md:pl-[56px]' : 'md:pl-[220px]',
        )}
      >
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] md:pb-6">
          <motion.div
            key={title}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />

      {/* Command Palette */}
      <CommandPalette />

      {/* AI Agent */}
      <NexusAIChat />

      {/* Reminder scheduler — fires browser notifications for upcoming events */}
      <ReminderScheduler />

      {/* Keyboard shortcuts overlay — press ? to open */}
      <KeyboardShortcuts />

      {/* Onboarding tour — shown once for new users */}
      <OnboardingTour />
    </div>
  );
};
