/**
 * CourtsTimeline
 * ---------------------------------------------------------------------------
 * Vista tipo "Gantt horizontal" para un día: cada cancha es una fila, y los
 * turnos se dibujan como barras posicionadas proporcionalmente sobre la
 * franja operativa (13:00 - 22:00).
 *
 * Estados visualizados:
 *   - Tu reserva       → barra verde sólida
 *   - No disponible    → barra gris (otra reserva o turno fijo)
 *   - Disponible       → espacio en blanco
 *
 * Datos:
 *   - Llama a /reservations/availability por cada cancha (en paralelo).
 *   - Cruza con las reservas propias para identificar cuáles son "tuyas".
 *
 * Decisión académica: el componente NO recalcula slots — usa la fuente de
 * verdad del backend para mantener la lógica centralizada (BookingPolicy +
 * turnos fijos). El frontend sólo posiciona.
 */

'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays, Info } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { AvailabilitySlot, CourtDto, ReservationDto } from '@/lib/types';
import { cn, parseDateLocal } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/** Franja operativa, en minutos desde medianoche. */
const OPEN_MIN = 13 * 60;  // 780
const CLOSE_MIN = 22 * 60; // 1320
const DAY_RANGE = CLOSE_MIN - OPEN_MIN; // 540

/** Horas que se muestran como labels (13, 14, ..., 22). */
const HOUR_LABELS = Array.from({ length: CLOSE_MIN / 60 - OPEN_MIN / 60 + 1 }, (_, i) =>
  OPEN_MIN / 60 + i,
);

interface Props {
  date: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  courts: CourtDto[];
  myReservations: ReservationDto[];
  /**
   * Si se pasa, los slots DISPONIBLES (futuros, no reservados) se renderizan
   * como botones clickeables. Los ocupados siguen siendo sólo visuales.
   * Cuando no se pasa, el componente es 100% read-only.
   */
  onSlotClick?: (court: CourtDto, slot: AvailabilitySlot) => void;
}

export function CourtsTimeline({
  date,
  onDateChange,
  courts,
  myReservations,
  onSlotClick,
}: Props) {
  // Una sola query con Promise.all → un solo cache key.
  // Las canchas SUSPENDIDAS no se consultan al backend (devolvería 400);
  // se incluyen en el resultado con slots vacíos para renderizarlas en
  // estado deshabilitado en el calendario.
  const allAvailabilityQuery = useQuery({
    queryKey: [
      'timeline-availability',
      date,
      courts.map((c) => `${c.id}:${c.isActive ? 1 : 0}`).join(','),
    ],
    queryFn: async () => {
      const arr = await Promise.all(
        courts.map((c) => {
          if (!c.isActive) {
            return Promise.resolve<AvailabilitySlot[]>([]);
          }
          return api<AvailabilitySlot[]>('/reservations/availability', {
            anonymous: true,
            query: { courtId: c.id, date },
          });
        }),
      );
      return courts.map((c, i) => ({ court: c, slots: arr[i] }));
    },
    enabled: courts.length > 0 && Boolean(date),
    refetchOnWindowFocus: false,
  });

  // Set de IDs de reservas propias del día para identificar "tu reserva".
  const myIdSet = React.useMemo(() => {
    const dayStart = parseDateLocal(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return new Set(
      myReservations
        .filter((r) => {
          const t = new Date(r.startTime);
          return t >= dayStart && t < dayEnd && r.status !== 'CANCELLED';
        })
        .map((r) => r.id),
    );
  }, [myReservations, date]);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const goPrev = () => onDateChange(format(subDays(parseDateLocal(date), 1), 'yyyy-MM-dd'));
  const goNext = () => onDateChange(format(addDays(parseDateLocal(date), 1), 'yyyy-MM-dd'));

  const handleCalendarChange = (v: string) => {
    onDateChange(v);
    setPickerOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* ===== Header ===== */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎾</span>
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Pádel
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                <CalendarDays className="h-4 w-4 text-brand-600" />
                <span className="capitalize">
                  {format(parseDateLocal(date), "EEEE d 'de' MMM", { locale: es })}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar value={date} onChange={handleCalendarChange} />
            </PopoverContent>
          </Popover>

          <button
            onClick={goNext}
            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ===== Hour labels ===== */}
      <div className="grid border-b border-zinc-200 dark:border-zinc-800"
           style={{ gridTemplateColumns: `220px repeat(${HOUR_LABELS.length}, minmax(0, 1fr))` }}>
        <div className="border-r border-zinc-200 px-3 py-2 dark:border-zinc-800" />
        {HOUR_LABELS.map((h) => (
          <div
            key={h}
            className="border-l border-zinc-100 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500 first:border-l-0 dark:border-zinc-800 dark:text-zinc-400"
          >
            {String(h).padStart(2, '0')}
          </div>
        ))}
      </div>

      {/* ===== Rows ===== */}
      <div>
        {courts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No hay canchas configuradas todavía. Creá una desde{' '}
            <span className="font-medium">Canchas → Nueva cancha</span>.
          </p>
        ) : allAvailabilityQuery.isLoading || allAvailabilityQuery.isPending ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: courts.length }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : allAvailabilityQuery.isError ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              No pudimos cargar la disponibilidad.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Verificá la conexión con el backend y refrescá la página.
            </p>
          </div>
        ) : (
          (allAvailabilityQuery.data ?? []).map(({ court, slots }) => (
            <CourtRow
              key={court.id}
              court={court}
              slots={slots}
              myIdSet={myIdSet}
              onSlotClick={onSlotClick}
            />
          ))
        )}
      </div>

      {/* ===== Footer / legend ===== */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Info className="h-3.5 w-3.5 text-brand-600" />
          Las reservas se pueden realizar con hasta 30 días de anticipación.
        </p>
        <div className="flex items-center gap-4 text-xs">
          <LegendItem color="bg-zinc-300 dark:bg-zinc-600" label="No disponible" />
          <LegendItem color="bg-brand-500" label="Tu reserva" />
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
//  Fila por cancha
// ============================================================================

function CourtRow({
  court,
  slots,
  myIdSet,
  onSlotClick,
}: {
  court: CourtDto;
  slots: AvailabilitySlot[];
  myIdSet: Set<string>;
  onSlotClick?: (court: CourtDto, slot: AvailabilitySlot) => void;
}) {
  const isInactive = !court.isActive;

  return (
    <div
      className={cn(
        'grid border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/60',
        isInactive && 'bg-zinc-50/70 dark:bg-zinc-950/40',
      )}
      style={{ gridTemplateColumns: `220px repeat(${HOUR_LABELS.length}, minmax(0, 1fr))` }}
    >
      {/* Sidebar de la cancha */}
      <div
        className={cn(
          'border-r border-zinc-200 px-3 py-3 dark:border-zinc-800',
          isInactive && 'opacity-70',
        )}
      >
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-semibold',
              isInactive
                ? 'text-zinc-500 line-through dark:text-zinc-500'
                : 'text-zinc-900 dark:text-zinc-50',
            )}
          >
            {court.name}
          </p>
          {isInactive && (
            <span className="inline-flex items-center rounded-full bg-zinc-200 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Suspendida
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
          {court.description ?? court.sportType.toLowerCase()}
        </p>
      </div>

      {/* Track con líneas verticales + barras */}
      <div
        className="relative col-span-full"
        style={{ gridColumn: `2 / span ${HOUR_LABELS.length}` }}
      >
        {/* Líneas verticales sutiles entre horas */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${HOUR_LABELS.length}, minmax(0, 1fr))` }}
        >
          {HOUR_LABELS.map((h, i) => (
            <div
              key={h}
              className={cn(
                'border-l',
                i === 0 ? 'border-transparent' : 'border-zinc-100 dark:border-zinc-800/60',
              )}
            />
          ))}
        </div>

        {/* Overlay para canchas suspendidas: textura diagonal + texto */}
        {isInactive && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent 0 8px, rgba(113,113,122,0.08) 8px 12px)',
            }}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              cancha suspendida · sin reservas
            </span>
          </div>
        )}

        {/* Barras de turnos */}
        <div className="relative h-14">
          {!isInactive &&
            slots.map((s) => {
              const isMine = s.reservationId ? myIdSet.has(s.reservationId) : false;
              const isPast = new Date(s.start) < new Date();

              if (s.isReserved) {
                return <Bar key={s.start} slot={s} isMine={isMine} />;
              }
              if (isPast) return null;
              return (
                <AvailableBar
                  key={s.start}
                  slot={s}
                  onClick={onSlotClick ? () => onSlotClick(court, s) : undefined}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

function AvailableBar({
  slot,
  onClick,
}: {
  slot: AvailabilitySlot;
  onClick?: () => void;
}) {
  const { left, width } = slotPosition(slot);
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const title = `Reservar ${formatTime(start)}–${formatTime(end)}`;

  const baseClasses =
    'absolute top-1/2 -translate-y-1/2 h-9 rounded-lg ' +
    'flex items-center px-2 text-[11px] font-medium overflow-hidden whitespace-nowrap';

  // Si no es interactivo, mostramos un placeholder muy tenue para sugerir
  // que hay slot disponible pero sin invitar al click.
  if (!onClick) {
    return (
      <div
        title={`${formatTime(start)}–${formatTime(end)} · Disponible`}
        className={cn(
          baseClasses,
          'border border-dashed border-brand-300/60 text-brand-700/70',
          'dark:border-brand-700/40 dark:text-brand-400/70',
        )}
        style={{ left: `${left}%`, width: `${width}%` }}
      >
        <span className="font-mono tabular-nums">{formatTime(start)}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        baseClasses,
        'border-2 border-brand-300 bg-brand-50/60 text-brand-800',
        'hover:bg-brand-100 hover:border-brand-500',
        'dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
        'dark:hover:bg-brand-900/50 dark:hover:border-brand-500',
        'transition-colors active:scale-[0.97] cursor-pointer',
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      <span className="font-mono tabular-nums">{formatTime(start)}</span>
    </button>
  );
}

function slotPosition(slot: AvailabilitySlot) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  return {
    left: ((startMin - OPEN_MIN) / DAY_RANGE) * 100,
    width: ((endMin - startMin) / DAY_RANGE) * 100,
  };
}

function Bar({ slot, isMine }: { slot: AvailabilitySlot; isMine: boolean }) {
  const { left, width } = slotPosition(slot);
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const title = `${formatTime(start)} – ${formatTime(end)}${isMine ? ' · Tu reserva' : ''}`;

  return (
    <div
      title={title}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 h-9 rounded-lg shadow-sm',
        'flex items-center px-2 text-[11px] font-medium overflow-hidden whitespace-nowrap',
        isMine
          ? 'bg-brand-500 text-white shadow-[0_2px_8px_-2px_rgba(16,185,129,0.5)]'
          : 'bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      <span className="font-mono tabular-nums">{formatTime(start)}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
      <span className={cn('h-3 w-5 rounded-sm', color)} />
      {label}
    </span>
  );
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
