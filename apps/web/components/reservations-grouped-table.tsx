/**
 * ReservationsGroupedTable
 * ---------------------------------------------------------------------------
 * Lista de reservas de un día separada en 4 categorías mutuamente exclusivas
 * y agrupada internamente por cancha. Las categorías son:
 *
 *   1. Pendientes     → status === PENDING
 *   2. Confirmadas    → status === CONFIRMED y NUNCA fue reprogramada
 *   3. Reprogramadas  → status === CONFIRMED y rescheduledAt !== null
 *   4. Canceladas     → status === CANCELLED
 *
 * Cada categoría es colapsable y muestra el conteo. Las acciones (confirmar,
 * reprogramar, cancelar) se mantienen por fila, igual que en la tabla plana
 * original.
 */

'use client';

import * as React from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReservationDto } from '@/lib/types';
import { cn, formatDateLong, formatTime } from '@/lib/utils';

type Category = 'pending' | 'confirmed' | 'rescheduled' | 'cancelled';

interface Section {
  key: Category;
  label: string;
  badgeClass: string;
  items: ReservationDto[];
}

function categorize(r: ReservationDto): Category {
  if (r.status === 'CANCELLED') return 'cancelled';
  if (r.status === 'PENDING') return 'pending';
  if (r.rescheduledAt) return 'rescheduled';
  return 'confirmed';
}

interface Props {
  reservations: ReservationDto[];
  onConfirm: (id: string) => void;
  onReschedule: (r: ReservationDto) => void;
  onCancel: (id: string) => void;
  /** ID de la reserva con mutación pendiente para mostrar loading en el botón. */
  pendingId?: string | null;
}

export function ReservationsGroupedTable({
  reservations,
  onConfirm,
  onReschedule,
  onCancel,
  pendingId,
}: Props) {
  const sections: Section[] = React.useMemo(() => {
    const buckets: Record<Category, ReservationDto[]> = {
      pending: [],
      confirmed: [],
      rescheduled: [],
      cancelled: [],
    };
    for (const r of reservations) {
      buckets[categorize(r)].push(r);
    }
    return [
      {
        key: 'pending',
        label: 'Pendientes de confirmación',
        badgeClass:
          'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        items: buckets.pending,
      },
      {
        key: 'confirmed',
        label: 'Confirmadas',
        badgeClass:
          'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
        items: buckets.confirmed,
      },
      {
        key: 'rescheduled',
        label: 'Reprogramadas',
        badgeClass:
          'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
        items: buckets.rescheduled,
      },
      {
        key: 'cancelled',
        label: 'Canceladas',
        badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
        items: buckets.cancelled,
      },
    ];
  }, [reservations]);

  if (reservations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No hay reservas para esta fecha.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((s) =>
        s.items.length === 0 ? null : (
          <CategorySection
            key={s.key}
            section={s}
            onConfirm={onConfirm}
            onReschedule={onReschedule}
            onCancel={onCancel}
            pendingId={pendingId}
          />
        ),
      )}
    </div>
  );
}

// ============================================================================
//  Sección colapsable por categoría
// ============================================================================

function CategorySection({
  section,
  onConfirm,
  onReschedule,
  onCancel,
  pendingId,
}: {
  section: Section;
  onConfirm: (id: string) => void;
  onReschedule: (r: ReservationDto) => void;
  onCancel: (id: string) => void;
  pendingId?: string | null;
}) {
  // Pendientes y confirmadas abiertas por defecto; el resto colapsadas para
  // no saturar visualmente.
  const [open, setOpen] = React.useState(
    section.key === 'pending' || section.key === 'confirmed',
  );

  // Sub-agrupación por cancha dentro de la categoría.
  const byCourt = React.useMemo(() => {
    const map = new Map<string, ReservationDto[]>();
    for (const r of section.items) {
      const key = r.court?.name ?? '—';
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    // Ordenamos canchas alfabéticamente, y reservas dentro de cancha por hora.
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([courtName, items]) => ({
        courtName,
        items: items
          .slice()
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          ),
      }));
  }, [section.items]);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-zinc-50/60 px-4 py-3 text-left transition-colors hover:bg-zinc-100 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          )}
          <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            / {section.label.toLowerCase()}
          </span>
          <span
            className={cn(
              'ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums',
              section.badgeClass,
            )}
          >
            {section.items.length}
          </span>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800/60 dark:bg-zinc-900">
          {byCourt.map(({ courtName, items }) => (
            <CourtGroup
              key={courtName}
              category={section.key}
              courtName={courtName}
              items={items}
              onConfirm={onConfirm}
              onReschedule={onReschedule}
              onCancel={onCancel}
              pendingId={pendingId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
//  Grupo "Cancha X" dentro de una sección
// ============================================================================

function CourtGroup({
  category,
  courtName,
  items,
  onConfirm,
  onReschedule,
  onCancel,
  pendingId,
}: {
  category: Category;
  courtName: string;
  items: ReservationDto[];
  onConfirm: (id: string) => void;
  onReschedule: (r: ReservationDto) => void;
  onCancel: (id: string) => void;
  pendingId?: string | null;
}) {
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {courtName}
        <span className="ml-2 font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
          ({items.length})
        </span>
      </p>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {items.map((r) => (
          <ReservationRow
            key={r.id}
            category={category}
            reservation={r}
            onConfirm={onConfirm}
            onReschedule={onReschedule}
            onCancel={onCancel}
            pendingId={pendingId}
          />
        ))}
      </ul>
    </div>
  );
}

function ReservationRow({
  category,
  reservation,
  onConfirm,
  onReschedule,
  onCancel,
  pendingId,
}: {
  category: Category;
  reservation: ReservationDto;
  onConfirm: (id: string) => void;
  onReschedule: (r: ReservationDto) => void;
  onCancel: (id: string) => void;
  pendingId?: string | null;
}) {
  const r = reservation;
  const isPendingThis = pendingId === r.id;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatTime(r.startTime)} – {formatTime(r.endTime)}
          </span>
          {category === 'rescheduled' && r.rescheduledAt && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              · reprogramada {formatTime(r.rescheduledAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {r.user?.name ?? '—'}
          {r.user?.email && (
            <>
              {' · '}
              <span className="text-zinc-400 dark:text-zinc-500">
                {r.user.email}
              </span>
            </>
          )}
        </div>
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {formatDateLong(r.startTime)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {category === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onConfirm(r.id)}
            loading={isPendingThis}
          >
            <Check className="h-3.5 w-3.5" />
            Confirmar
          </Button>
        )}
        {category !== 'cancelled' && (
          <>
            <Button size="sm" variant="outline" onClick={() => onReschedule(r)}>
              Reprogramar
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onCancel(r.id)}
              loading={isPendingThis}
            >
              Cancelar
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
