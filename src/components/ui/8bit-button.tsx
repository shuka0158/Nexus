'use client';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, className, ...rest }) => (
  <button
    {...rest}
    className={cn(
      'retro inline-block px-4 py-2 text-xs sm:text-sm font-bold tracking-wide',
      'bg-white text-black border-2 border-white',
      'shadow-[4px_4px_0_0_#000]',
      'transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]',
      'hover:bg-[#e5e5e5] cursor-pointer',
      className,
    )}
  >
    {children}
  </button>
);
