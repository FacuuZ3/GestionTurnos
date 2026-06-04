/**
 * Utilidades genéricas del frontend.
 *  - cn(): combina clases condicionales (helper shadcn/ui).
 *  - formatPriceARS(): formato moneda Argentina.
 *  - formatDateLong(): fecha completa en español.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPriceARS(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "EEEE d 'de' MMMM, HH:mm 'hs'", { locale: es });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm', { locale: es });
}

/**
 * Parsea un string "YYYY-MM-DD" como medianoche LOCAL.
 * `new Date("YYYY-MM-DD")` lo interpreta como UTC; en Argentina (UTC-3) eso
 * provoca que la fecha calendario local caiga en el día anterior.
 * Esta función arma el Date con el constructor por componentes, en hora local.
 */
export function parseDateLocal(ymd: string): Date {
  const datePart = ymd.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
}

/**
 * Expande un turno fijo (recurrente semanal) en instancias concretas dentro
 * de una ventana de fechas. Devuelve un Date de inicio y fin por cada
 * ocurrencia.
 *
 * Ej.: si el bloqueo es "Viernes 13:00-14:30" y la ventana va del 2026-05-18
 * al 2026-06-30, devuelve un evento por cada viernes en ese rango.
 */
export interface RecurringExpansion {
  start: Date;
  end: Date;
}

export function expandRecurringInWindow(
  dayOfWeek: number,
  startMinute: number,
  endMinute: number,
  windowStart: Date,
  windowEnd: Date,
): RecurringExpansion[] {
  const out: RecurringExpansion[] = [];
  // Localizamos el primer día del rango que coincida con dayOfWeek.
  const cursor = new Date(windowStart);
  cursor.setHours(0, 0, 0, 0);
  const offset = (dayOfWeek - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + offset);

  while (cursor <= windowEnd) {
    const start = new Date(cursor);
    start.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);
    const end = new Date(cursor);
    end.setHours(Math.floor(endMinute / 60), endMinute % 60, 0, 0);
    out.push({ start, end });
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}
