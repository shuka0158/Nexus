'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface NeonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(({
  label,
  error,
  hint,
  icon,
  iconRight,
  fullWidth = true,
  className,
  ...props
}, ref) => (
  <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
    {label && (
      <label className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]">{icon}</span>
      )}
      <input
        ref={ref}
        className={cn(
          'bg-[#000000] border border-[#444444] rounded text-white placeholder:text-[#555555]',
          'focus:outline-none focus:border-white focus:ring-1 focus:ring-white',
          'transition-colors duration-100',
          'py-2 text-sm',
          icon ? 'pl-9 pr-3' : 'px-3',
          iconRight ? 'pr-9' : '',
          error && 'border-[#cf222e] focus:border-[#cf222e] focus:ring-[#cf222e]',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      />
      {iconRight && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666]">{iconRight}</span>
      )}
    </div>
    {error && <span className="text-xs text-[#ff4d4f]">{error}</span>}
    {hint && !error && <span className="text-xs text-[#666666]">{hint}</span>}
  </div>
));
NeonInput.displayName = 'NeonInput';
