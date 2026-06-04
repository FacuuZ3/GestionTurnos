/**
 * /dashboard/user/reservar
 * ---------------------------------------------------------------------------
 * Página dedicada a reservar turnos. Muestra la timeline horizontal con todas
 * las canchas del complejo y permite hacer click sobre los slots disponibles
 * (futuros, no ocupados) para confirmarlos en un modal.
 *
 * Al confirmar exitosamente, redirige a /dashboard/user (Mis reservas).
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { CourtsTimeline } from '@/components/courts-timeline';
import { ReservationModal } from '@/components/reservation-modal';
import { api } from '@/lib/api';
import { AvailabilitySlot, CourtDto, ReservationDto } from '@/lib/types';

export default function ReservarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [date, setDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedCourt, setSelectedCourt] = React.useState<CourtDto | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<{ start: string; end: string } | null>(
    null,
  );

  const courtsQuery = useQuery({
    queryKey: ['courts'],
    queryFn: () => api<CourtDto[]>('/courts', { anonymous: true }),
  });

  const myReservationsQuery = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => api<ReservationDto[]>('/reservations/me'),
  });

  const handleSlotClick = (court: CourtDto, slot: AvailabilitySlot) => {
    setSelectedCourt(court);
    setSelectedSlot({ start: slot.start, end: slot.end });
    setModalOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    queryClient.invalidateQueries({ queryKey: ['timeline-availability'] });
    router.push('/dashboard/user');
  };

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/user"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="h-3 w-3" />
            Volver a Mis reservas
          </Link>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-brand-700 dark:text-brand-400">
            / reservar
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Elegí tu turno
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tocá un horario libre para reservarlo. Los grises ya están ocupados.
          </p>
        </div>
      </header>

      <CourtsTimeline
        date={date}
        onDateChange={setDate}
        courts={courtsQuery.data ?? []}
        myReservations={myReservationsQuery.data ?? []}
        onSlotClick={handleSlotClick}
      />

      <ReservationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        court={selectedCourt}
        slot={selectedSlot}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
