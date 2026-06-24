/**
 * /dashboard/admin - Gestión de reservas.
 * ---------------------------------------------------------------------------
 * Vista timeline horizontal (todas las canchas en filas, slots como barras).
 *   - Click en slot libre  → abre modal de reserva (igual flujo que usuario).
 *   - Click en una reserva del calendario → modal de reprogramación.
 *   - Tabla debajo: lista del día con acciones rápidas (cancelar/confirmar).
 *
 * El admin está exento de la BookingPolicy (anticipación / límites), por lo
 * que puede reservar y cancelar libremente. La lógica de exención vive en
 * ReservationsService.create / cancel.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Dashboard administrativo - Gestión operativa diaria
 */

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CourtsTimeline } from '@/components/courts-timeline';
import { ReservationModal } from '@/components/reservation-modal';
import { RescheduleModal } from '@/components/reschedule-modal';
import { ReservationsGroupedTable } from '@/components/reservations-grouped-table';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  AvailabilitySlot,
  CourtDto,
  ReservationDto,
  ReservationStatus,
} from '@/lib/types';

export default function AdminReservationsPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Modales
  const [reserveOpen, setReserveOpen] = React.useState(false);
  const [reserveCourt, setReserveCourt] = React.useState<CourtDto | null>(null);
  const [reserveSlot, setReserveSlot] = React.useState<{ start: string; end: string } | null>(null);

  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [selectedReservation, setSelectedReservation] = React.useState<ReservationDto | null>(null);

  // Queries
  // includeInactive=true para que el admin vea TODAS las canchas (incluso
  // las suspendidas) — la timeline las marca visualmente como no reservables.
  const courtsQuery = useQuery({
    queryKey: ['admin-courts-filter'],
    queryFn: () => api<CourtDto[]>('/courts', { query: { includeInactive: 'true' } }),
  });

  // Lo usa la timeline para distinguir "mías" (verde). Para el admin
  // representa las reservas que él mismo creó (bloqueos / turnos propios).
  const myReservationsQuery = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => api<ReservationDto[]>('/reservations/me'),
  });

  const reservationsQuery = useQuery({
    queryKey: ['admin-reservations', date],
    queryFn: () =>
      api<ReservationDto[]>('/reservations', {
        query: { date: date || undefined },
      }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Mutaciones
  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api<ReservationDto>(`/reservations/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-availability'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: ReservationStatus }) =>
      api<ReservationDto>(`/reservations/${vars.id}/status`, {
        method: 'PATCH',
        body: { status: vars.status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-availability'] });
    },
  });

  // Handlers
  const onSlotClick = (court: CourtDto, slot: AvailabilitySlot) => {
    setReserveCourt(court);
    setReserveSlot({ start: slot.start, end: slot.end });
    setReserveOpen(true);
  };

  const openReschedule = (r: ReservationDto) => {
    setSelectedReservation(r);
    setRescheduleOpen(true);
  };

  const openManualReserve = () => {
    setReserveCourt(null);
    setReserveSlot(null);
    // Si no tenemos slot pre-seleccionado, la modal no podrá abrirse sin datos.
    // Para crear "a mano" mostramos el aviso al admin de que use el timeline.
    // Una v2 podría tener un modal genérico de crear sin slot pre-armado.
    alert(
      'Tocá un horario libre en el calendario abajo para reservarlo. Como admin podés saltarte las restricciones de tiempo.',
    );
  };

  return (
    <div className="space-y-6">
      {/* Header con CTA */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700 dark:text-brand-400">
            / reservas
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Calendario operativo
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tocá un horario libre para reservarlo. Como admin no tenés restricciones
            de tiempo ni de cantidad.
          </p>
        </div>
        <Button onClick={openManualReserve}>
          <CalendarPlus className="h-4 w-4" />
          Cómo reservar
        </Button>
      </header>

      {/* Timeline interactiva — las inactivas se muestran greyed out. */}
      <CourtsTimeline
        date={date}
        onDateChange={setDate}
        courts={courtsQuery.data ?? []}
        myReservations={myReservationsQuery.data ?? []}
        onSlotClick={onSlotClick}
      />

      {/* Exportar reporte de reservas (PDF: descarga o email) */}
      <ReportExportCard courts={courtsQuery.data ?? []} defaultDate={date} />

      {/* Reservas del día — agrupadas por estado y por cancha */}
      <Card>
        <CardHeader>
          <CardTitle>Reservas del día</CardTitle>
          <CardDescription>
            Separadas por estado (pendientes, confirmadas, reprogramadas,
            canceladas) y agrupadas por cancha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReservationsGroupedTable
            reservations={reservationsQuery.data ?? []}
            onConfirm={(id) =>
              statusMutation.mutate({ id, status: 'CONFIRMED' })
            }
            onReschedule={openReschedule}
            onCancel={(id) => cancelMutation.mutate(id)}
            pendingId={
              cancelMutation.isPending
                ? (cancelMutation.variables as string)
                : statusMutation.isPending
                ? (statusMutation.variables?.id ?? null)
                : null
            }
          />
          {(cancelMutation.isError || statusMutation.isError) && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {(cancelMutation.error || statusMutation.error) instanceof ApiError
                ? (cancelMutation.error ?? statusMutation.error)!.message
                : 'Ocurrió un error en la acción.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <ReservationModal
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        court={reserveCourt}
        slot={reserveSlot}
      />
      <RescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        reservation={selectedReservation}
      />
    </div>
  );
}

// ===========================================================================
//  Exportación de reportes (PDF descargable o enviado por email)
// ===========================================================================

const STATUS_OPTIONS: { value: '' | ReservationStatus; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

const selectClass =
  'h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 ' +
  'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100';

function ReportExportCard({
  courts,
  defaultDate,
}: {
  courts: CourtDto[];
  defaultDate: string;
}) {
  const [date, setDate] = React.useState(defaultDate);
  const [courtId, setCourtId] = React.useState('');
  const [status, setStatus] = React.useState<'' | ReservationStatus>('');
  const [feedback, setFeedback] = React.useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  // Filtros en el formato que esperan los endpoints (undefined = sin filtro).
  const queryParams = () => ({
    date: date || undefined,
    courtId: courtId || undefined,
    status: status || undefined,
  });

  const emailMutation = useMutation({
    mutationFn: () =>
      api<{ message: string; records: number }>('/reservations/report/email', {
        method: 'POST',
        query: queryParams(),
      }),
    onSuccess: (res) =>
      setFeedback({ kind: 'ok', msg: `${res.message} (${res.records} registro/s).` }),
    onError: (e) =>
      setFeedback({
        kind: 'error',
        msg: e instanceof ApiError ? e.message : 'No pudimos enviar el reporte.',
      }),
  });

  const downloadPdf = async () => {
    setFeedback(null);
    setDownloading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const url = new URL(`${base}/api/reservations/report.pdf`);
      const params = queryParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) url.searchParams.set(k, String(v));
      });
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `reservas-${date || 'todas'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      setFeedback({
        kind: 'error',
        msg: e instanceof Error ? e.message : 'No pudimos generar el PDF.',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar reporte de reservas</CardTitle>
        <CardDescription>
          Filtrá por fecha, cancha y estado, y descargá el PDF o recibilo por email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Fecha</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Cancha</label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className={selectClass}
            >
              <option value="">Todas las canchas</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | ReservationStatus)}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadPdf} loading={downloading}>
              Descargar PDF
            </Button>
            <Button onClick={() => emailMutation.mutate()} loading={emailMutation.isPending}>
              Enviar por email
            </Button>
          </div>
        </div>

        {feedback && (
          <div
            className={
              'rounded-md border p-3 text-sm ' +
              (feedback.kind === 'ok'
                ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300')
            }
          >
            {feedback.msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

