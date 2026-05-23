'use client';

import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends MotionProps {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
  glowColor?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  className,
  children,
  glow = false,
  glowColor,
  hover = true,
  padding = 'md',
  border = true,
  ...motionProps
}) => {
  const padMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-8' };

  return (
    <motion.div
      className={cn(
        'relative rounded-md overflow-hidden',
        border && 'border border-[#333333]',
        padMap[padding],
        className
      )}
      style={{ background: '#111111' }}
      whileHover={hover ? { y: -1 } : undefined}
      transition={{ duration: 0.12 }}
      {...motionProps}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
