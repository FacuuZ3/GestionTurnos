/**
 * DatePicker
 * ---------------------------------------------------------------------------
 * Botón con apariencia de input que abre un popover con el Calendar.
 * El Calendar está extraído como componente independiente para poder
 * embeberse directamente en otros popovers sin anidar pop-up dentro de
 * pop-up (que requería 2 clicks).
 */

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn, parseDateLocal } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Elegí una fecha',
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = value ? parseDateLocal(value) : undefined;

  const handleChange = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
            'transition-[border-color,box-shadow] duration-150',
            'border-zinc-200 bg-white text-zinc-900',
            'shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.02)]',
            'hover:border-zinc-300',
            'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
            'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-none',
            'dark:hover:border-zinc-700 dark:focus:ring-brand-500/20',
          )}
        >
          <span className={cn(value ? '' : 'text-zinc-400 dark:text-zinc-500')}>
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM yyyy", { locale: es })
              : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar value={value} onChange={handleChange} min={min} />
      </PopoverContent>
    </Popover>
  );
}
