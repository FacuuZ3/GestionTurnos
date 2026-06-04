'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150',
          // Claro
          'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400',
          'shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.02)]',
          'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
          // Oscuro
          'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
          'dark:shadow-none dark:focus:border-brand-500 dark:focus:ring-brand-500/20',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    );
  },
);
