'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, CheckSquare, Timer, Menu } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

const PRIMARY = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/calendar',  icon: Calendar,        label: 'Calendar' },
  { href: '/todos',     icon: CheckSquare,     label: 'Tasks' },
  { href: '/pomodoro',  icon: Timer,           label: 'Focus' },
];

export const MobileTabBar: React.FC = () => {
  const pathname = usePathname();
  const router   = useRouter();
  const { unreadCount } = useNotifications();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (!isMobile) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch md:hidden"
      style={{
        background: 'rgba(0,0,0,0.92)',
        borderTop: '1px solid #333333',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {PRIMARY.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[56px]',
              active ? 'text-white' : 'text-[#666666] hover:text-white active:bg-[#111]',
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
            <span className={cn('text-[10px] tracking-wide', active ? 'font-semibold' : 'font-medium')}>{label}</span>
            {active && <span className="absolute top-0 h-0.5 w-8 bg-white rounded-b" />}
          </button>
        );
      })}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
        className="flex-1 relative flex flex-col items-center justify-center gap-0.5 py-2 text-[#666666] hover:text-white active:bg-[#111] transition-colors min-h-[56px]"
      >
        <Menu className="w-5 h-5" strokeWidth={1.8} />
        <span className="text-[10px] font-medium tracking-wide">More</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-[30%] w-2 h-2 rounded-full bg-[#cf222e]" />
        )}
      </button>
    </nav>
  );
};
