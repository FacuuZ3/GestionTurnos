/**
 * Calendar
 * ---------------------------------------------------------------------------
 * react-day-picker estilizado + 3 atajos rápidos. Es la versión "pelada":
 * no incluye ni botón disparador ni popover, sólo el panel del calendario.
 * Sirve tanto para `DatePicker` (popover) como para insertarse directo en
 * otros popovers (como el header de CourtsTimeline).
 */

'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseDateLocal } from '@/lib/utils';

interface CalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  min?: string; // YYYY-MM-DD
}

export function Calendar({ value, onChange, min }: CalendarProps) {
  const selectedDate = value ? parseDateLocal(value) : undefined;
  const minDate = min ? parseDateLocal(min) : undefined;

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    onChange(format(d, 'yyyy-MM-dd'));
  };

  const setRelative = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    onChange(format(d, 'yyyy-MM-dd'));
  };

  return (
    <div>
      {/* Atajos rápidos */}
      <div className="flex items-center justify-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <ShortcutButton onClick={() => setRelative(0)}>Hoy</ShortcutButton>
        <ShortcutButton onClick={() => setRelative(1)}>Mañana</ShortcutButton>
        <ShortcutButton onClick={() => setRelative(7)}>Próx. semana</ShortcutButton>
      </div>

      <DayPicker
        mode="single"
        locale={es}
        weekStartsOn={1}
        selected={selectedDate}
        onSelect={handleSelect}
        disabled={minDate ? { before: minDate } : undefined}
        defaultMonth={selectedDate ?? new Date()}
        showOutsideDays
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
        }}
        classNames={{
          months: 'p-3 space-y-3',
          month: 'space-y-3',
          caption: 'flex items-center justify-between px-1',
          caption_label: 'text-sm font-medium capitalize',
          nav: 'flex items-center gap-1',
          nav_button: cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md',
            'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
            'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            'transition-colors',
          ),
          nav_button_previous: '',
          nav_button_next: '',
          table: 'w-full border-collapse',
          head_row: 'flex',
          head_cell:
            'text-zinc-500 dark:text-zinc-400 rounded-md w-9 text-[10px] font-mono uppercase tracking-widest',
          row: 'flex w-full mt-1',
          cell: 'h-9 w-9 text-center text-sm p-0 relative',
          day: cn(
            'h-9 w-9 rounded-md font-normal tabular-nums',
            'text-zinc-800 hover:bg-zinc-100',
            'dark:text-zinc-200 dark:hover:bg-zinc-800',
            'transition-colors',
          ),
          day_today: 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-900/30 dark:text-brand-300',
          day_selected:
            'bg-brand-600 text-white hover:bg-brand-700 focus:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-700',
          day_outside: 'text-zinc-400 dark:text-zinc-600',
          day_disabled: 'text-zinc-300 dark:text-zinc-700 pointer-events-none',
        }}
      />
    </div>
  );
}

function ShortcutButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs font-medium',
        'text-brand-700 hover:bg-brand-50',
        'dark:text-brand-400 dark:hover:bg-zinc-800',
        'transition-colors',
      )}
    >
      {children}
    </button>
  );
}
