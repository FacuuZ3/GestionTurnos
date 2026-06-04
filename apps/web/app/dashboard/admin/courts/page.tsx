/**
 * /dashboard/admin/courts - CRUD completo de canchas.
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
import { CourtFormModal } from '@/components/court-form-modal';
import { api, ApiError } from '@/lib/api';
import { CourtDto } from '@/lib/types';
import { formatPriceARS } from '@/lib/utils';

export default function AdminCourtsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CourtDto | null>(null);

  const courtsQuery = useQuery({
    queryKey: ['admin-courts'],
    queryFn: () => api<CourtDto[]>('/courts', { query: { includeInactive: 'true' } }),
  });

  const [actionError, setActionError] = React.useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<CourtDto>(`/courts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-courts'] });
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-courts-filter'] });
    },
    onError: (e) =>
      setActionError(e instanceof ApiError ? e.message : 'No pudimos suspender la cancha.'),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ id: string; deletedReservations: number }>(`/courts/${id}/permanent`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => {
      setActionError(null);
      // Invalidamos todas las queries que pudieran tener referencias a la cancha
      // o sus reservas (que también se borraron).
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0];
          return (
            key === 'admin-courts' ||
            key === 'courts' ||
            key === 'admin-courts-filter' ||
            key === 'my-reservations' ||
            key === 'admin-reservations' ||
            key === 'timeline-availability' ||
            key === 'recurring-reservations'
          );
        },
      });
      if (data.deletedReservations > 0) {
        window.alert(
          `Cancha eliminada. Se borraron ${data.deletedReservations} reserva(s) asociada(s).`,
        );
      }
    },
    onError: (e) =>
      setActionError(e instanceof ApiError ? e.message : 'No pudimos eliminar la cancha.'),
  });

  const confirmAndDelete = (court: CourtDto) => {
    const ok = window.confirm(
      `¿Eliminar definitivamente "${court.name}"?\n\n` +
        '⚠️ Esta acción NO se puede deshacer. Si la cancha tiene reservas históricas, ' +
        'también se borrarán y dejarán de aparecer en los reportes.\n\n' +
        'Si querés conservar el historial, usá "Suspender" en lugar de eliminar.',
    );
    if (ok) permanentDeleteMutation.mutate(court.id);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (court: CourtDto) => {
    setEditing(court);
    setModalOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Canchas</CardTitle>
          <CardDescription>
            Alta, edición y suspensión (soft delete) de canchas del complejo.
          </CardDescription>
        </div>
        <Button onClick={openCreate}>Nueva cancha</Button>
      </CardHeader>
      <CardContent>
        {courtsQuery.isLoading && <p className="text-sm text-zinc-500">Cargando...</p>}
        {courtsQuery.data && courtsQuery.data.length === 0 && (
          <p className="text-sm text-zinc-500">No hay canchas cargadas.</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Deporte</th>
                <th className="py-2 pr-4">Precio/h</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(courtsQuery.data ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-zinc-500">{c.description}</div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{c.sportType}</td>
                  <td className="py-2 pr-4">{formatPriceARS(c.pricePerHour)}</td>
                  <td className="py-2 pr-4">
                    {c.isActive ? (
                      <span className="text-brand-700">Activa</span>
                    ) : (
                      <span className="text-red-600">Suspendida</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        Editar
                      </Button>
                      {c.isActive ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteMutation.mutate(c.id)}
                          loading={deleteMutation.isPending && deleteMutation.variables === c.id}
                        >
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => confirmAndDelete(c)}
                          loading={
                            permanentDeleteMutation.isPending &&
                            permanentDeleteMutation.variables === c.id
                          }
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {actionError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {actionError}
          </div>
        )}
      </CardContent>

      <CourtFormModal open={modalOpen} onOpenChange={setModalOpen} court={editing} />
    </Card>
  );
}
