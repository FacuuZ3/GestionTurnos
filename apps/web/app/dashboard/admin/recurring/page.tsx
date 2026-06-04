/**
 * /dashboard/admin/recurring - CRUD de turnos fijos semanales.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Frontend - Bloqueos recurrentes
 */

'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecurringFormModal } from '@/components/recurring-form-modal';
import { api, ApiError } from '@/lib/api';
import { CourtDto, RecurringReservationDto } from '@/lib/types';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function AdminRecurringPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = React.useState(false);

  const courtsQuery = useQuery({
    queryKey: ['admin-courts'],
    queryFn: () => api<CourtDto[]>('/courts', { query: { includeInactive: 'true' } }),
  });

  const recurringQuery = useQuery({
    queryKey: ['recurring-reservations'],
    queryFn: () => api<RecurringReservationDto[]>('/recurring-reservations'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<RecurringReservationDto>(`/recurring-reservations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  // Agrupamos por día de la semana para una vista más legible.
  const grouped = React.useMemo(() => {
    const map = new Map<number, RecurringReservationDto[]>();
    (recurringQuery.data ?? []).forEach((r) => {
      const arr = map.get(r.dayOfWeek) ?? [];
      arr.push(r);
      map.set(r.dayOfWeek, arr);
    });
    return map;
  }, [recurringQuery.data]);

  const activeCourts = (courtsQuery.data ?? []).filter((c) => c.isActive);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Turnos fijos</CardTitle>
          <CardDescription>
            Bloqueos automáticos que se aplican cada semana en el mismo día y horario.
          </CardDescription>
        </div>
        <Button onClick={() => setModalOpen(true)} disabled={activeCourts.length === 0}>
          Nuevo turno fijo
        </Button>
      </CardHeader>

      <CardContent>
        {recurringQuery.isLoading && (
          <p className="text-sm text-zinc-500">Cargando...</p>
        )}

        {recurringQuery.data && recurringQuery.data.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-12 text-center">
            <p className="text-sm text-zinc-600">
              Todavía no hay turnos fijos cargados.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Creá uno para reservar permanentemente un horario semanal (clases, alquileres
              periódicos, mantenimiento, etc.).
            </p>
          </div>
        )}

        {recurringQuery.data && recurringQuery.data.length > 0 && (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const items = grouped.get(day) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={day}>
                  <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                    {DAY_NAMES[day]}
                  </h3>
                  <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/70 bg-white">
                    {items.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-4 p-4">
                        <div>
                          <div className="font-mono text-sm tabular-nums text-zinc-900">
                            {minutesToHHMM(r.startMinute)} – {minutesToHHMM(r.endMinute)}
                          </div>
                          <div className="mt-1 text-sm text-zinc-700">
                            {r.court?.name ?? '—'}
                          </div>
                          {r.notes && (
                            <div className="mt-1 text-xs text-zinc-500">{r.notes}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteMutation.mutate(r.id)}
                          loading={
                            deleteMutation.isPending && deleteMutation.variables === r.id
                          }
                        >
                          Liberar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {deleteMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            {deleteMutation.error instanceof ApiError
              ? deleteMutation.error.message
              : 'No pudimos liberar el turno fijo.'}
          </p>
        )}
      </CardContent>

      <RecurringFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        courts={activeCourts}
      />
    </Card>
  );
}
