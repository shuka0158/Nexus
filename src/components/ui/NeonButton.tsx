'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface NeonButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
  glow?: boolean;
  fullWidth?: boolean;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  children,
  glow = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const sizeMap = {
    xs: 'px-2 py-0.5 text-xs gap-1',
    sm: 'px-3 py-1 text-sm gap-1.5',
    md: 'px-4 py-1.5 text-sm gap-2',
    lg: 'px-5 py-2 text-base gap-2',
    xl: 'px-7 py-2.5 text-lg gap-2.5',
  };

  // Pure black + white = maximum contrast
  const variantStyles: Record<Variant, string> = {
    primary:   'bg-white text-black border border-white font-semibold hover:bg-[#e0e0e0] hover:border-[#e0e0e0]',
    secondary: 'bg-transparent text-white border border-[#444444] font-medium hover:border-white hover:bg-[#1a1a1a]',
    ghost:     'bg-transparent text-[#aaaaaa] border border-transparent font-medium hover:text-white hover:bg-[#1a1a1a]',
    danger:    'bg-[#cf222e] text-white border border-[#cf222e] font-semibold hover:bg-[#a0192b]',
    success:   'bg-white text-black border border-white font-semibold hover:bg-[#e0e0e0]',
    outline:   'bg-transparent text-white border border-white font-medium hover:bg-[#1a1a1a]',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.08 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center rounded font-medium',
        'transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        sizeMap[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </>
      )}
    </motion.button>
  );
};
