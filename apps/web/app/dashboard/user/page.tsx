/**
 * /dashboard/user - Mis reservas (panel personal del jugador).
 * ---------------------------------------------------------------------------
 * Foco: visualizar tus propios turnos, no datos generales. Estructura:
 *
 *   1. Hero con saludo + fecha + CTA "Reservar turno".
 *   2. Próxima reserva DESTACADA (card grande con visual fuerte).
 *   3. Otras próximas (cards compactas).
 *   4. Historial (lista colapsable).
 *
 * La creación de reservas vive en /dashboard/user/reservar (página aparte).
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Frontend - Vista personal del usuario
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, CalendarPlus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { ReservationDto, UserDto } from '@/lib/types';
import { formatDateLong } from '@/lib/utils';

export default function UserDashboardPage() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api<UserDto>('/users/me'),
  });

  const myReservationsQuery = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => api<ReservationDto[]>('/reservations/me'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api<ReservationDto>(`/reservations/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });

  const reservations = myReservationsQuery.data ?? [];
  const now = new Date();

  const upcoming = reservations
    .filter((r) => r.status !== 'CANCELLED' && new Date(r.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const past = reservations
    .filter((r) => r.status === 'CANCELLED' || new Date(r.startTime) <= now)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const next = upcoming[0];
  const otherUpcoming = upcoming.slice(1);

  const onCancel = (id: string) => cancelMutation.mutate(id);

  return (
    <div className="container max-w-4xl space-y-8 py-8">
      <Hero name={meQuery.data?.name ?? ''} />

      {myReservationsQuery.isLoading ? (
        <NextReservationSkeleton />
      ) : (
        <NextReservation reservation={next} onCancel={onCancel} pendingId={cancelMutation.isPending ? (cancelMutation.variables as string) : null} />
      )}

      {otherUpcoming.length > 0 && (
        <UpcomingList reservations={otherUpcoming} onCancel={onCancel} />
      )}

      {past.length > 0 && <HistoryList reservations={past} />}

      {cancelMutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {cancelMutation.error instanceof ApiError
            ? cancelMutation.error.message
            : 'No pudimos cancelar la reserva.'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
//  Hero
// ============================================================================

function Hero({ name }: { name: string }) {
  const firstName = name ? name.split(' ')[0] : 'jugador';
  const dateLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700 dark:text-brand-400">
          / mis reservas
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Hola, {firstName}
        </h1>
        <p className="mt-1 text-sm capitalize text-zinc-500 dark:text-zinc-400">
          {dateLabel}
        </p>
      </div>

      <Link href="/dashboard/user/reservar">
        <Button size="lg">
          <CalendarPlus className="h-4 w-4" />
          Reservar turno
        </Button>
      </Link>
    </header>
  );
}

// ============================================================================
//  Próxima reserva (destacada)
// ============================================================================

function NextReservationSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
  );
}

function NextReservation({
  reservation,
  onCancel,
  pendingId,
}: {
  reservation: ReservationDto | undefined;
  onCancel: (id: string) => void;
  pendingId: string | null;
}) {
  if (!reservation) return <EmptyNext />;

  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const relative = formatDistanceToNow(start, { locale: es, addSuffix: true });

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-2">
        {/* Mitad izquierda: bloque visual de marca */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-white dark:from-brand-700 dark:to-brand-900">
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand-100/80">
            / próxima reserva
          </p>
          <p className="mt-3 text-sm text-brand-50/90">{relative}</p>

          <p className="mt-6 font-mono text-6xl font-bold leading-none tabular-nums">
            {format(start, 'HH:mm')}
          </p>
          <p className="mt-1 font-mono text-sm text-brand-100/90">
            hasta las {format(end, 'HH:mm')} hs
          </p>

          <p className="mt-6 text-2xl font-semibold capitalize">
            {format(start, 'EEEE d', { locale: es })}
          </p>
          <p className="text-base capitalize text-brand-100">
            de {format(start, 'MMMM yyyy', { locale: es })}
          </p>
        </div>

        {/* Mitad derecha: detalles + acciones */}
        <div className="flex flex-col justify-between p-8">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {reservation.court?.name ?? 'Cancha'}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <MapPin className="h-3 w-3" />
              {reservation.court?.description ?? 'Pádel · 90 minutos'}
            </p>

            {reservation.notes && (
              <div className="mt-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Observaciones
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {reservation.notes}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onCancel(reservation.id)}
              loading={pendingId === reservation.id}
            >
              Cancelar reserva
            </Button>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Hasta 4 hs antes del turno.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyNext() {
  return (
    <Card>
      <CardContent className="px-6 py-16 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          / sin turnos próximos
        </p>
        <h2 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          No tenés ningún turno reservado
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Cuando reserves un turno, lo vas a ver acá en grande con el detalle del día, horario y cancha.
        </p>
        <div className="mt-6">
          <Link href="/dashboard/user/reservar">
            <Button>
              Reservar mi primer turno
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
//  Otras próximas
// ============================================================================

function UpcomingList({
  reservations,
  onCancel,
}: {
  reservations: ReservationDto[];
  onCancel: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        / otras próximas
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {reservations.map((r) => (
          <UpcomingCard key={r.id} reservation={r} onCancel={() => onCancel(r.id)} />
        ))}
      </div>
    </section>
  );
}

function UpcomingCard({
  reservation,
  onCancel,
}: {
  reservation: ReservationDto;
  onCancel: () => void;
}) {
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="font-mono text-2xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
            {format(start, 'd MMM', { locale: es })}
          </p>
          <p className="text-sm capitalize text-zinc-500 dark:text-zinc-400">
            {format(start, 'EEEE', { locale: es })} · {format(start, 'HH:mm')}–
            {format(end, 'HH:mm')}
          </p>
          <p className="mt-3 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {reservation.court?.name ?? 'Cancha'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
//  Historial
// ============================================================================

function HistoryList({ reservations }: { reservations: ReservationDto[] }) {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? reservations : reservations.slice(0, 5);

  return (
    <section>
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        / historial
      </h2>
      <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {visible.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-800/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {r.court?.name ?? 'Cancha'}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {formatDateLong(r.startTime)}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
      {reservations.length > 5 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          {showAll ? 'Ver menos' : `Ver las ${reservations.length} reservas`}
        </button>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
        Cancelada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      Realizada
    </span>
  );
}
