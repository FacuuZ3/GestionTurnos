/**
 * ReservationModal: confirmación de creación de una reserva.
 * Muestra cancha, día y horario; consume POST /reservations al confirmar.
 */

'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { CourtDto, ReservationDto } from '@/lib/types';
import { formatDateLong, formatPriceARS } from '@/lib/utils';

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court: CourtDto | null;
  slot: { start: string; end: string } | null;
  onSuccess?: () => void;
}

export function ReservationModal({
  open,
  onOpenChange,
  court,
  slot,
  onSuccess,
}: ReservationModalProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api<ReservationDto>('/reservations', {
        method: 'POST',
        body: {
          courtId: court!.id,
          startTime: slot!.start,
          endTime: slot!.end,
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      setNotes('');
      setError(null);
      // Invalida todas las queries que dependen del estado de reservas:
      // - my-reservations (usuario y admin)
      // - admin-reservations (panel admin)
      // - availability / timeline-availability (vistas de slots)
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0];
          return (
            key === 'my-reservations' ||
            key === 'admin-reservations' ||
            key === 'availability' ||
            key === 'timeline-availability'
          );
        },
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? e.message : 'No pudimos confirmar el turno.');
    },
  });

  if (!court || !slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar reserva</DialogTitle>
          <DialogDescription>
            Revisá los datos del turno antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Row label="Cancha" value={court.name} />
          <Row label="Inicio" value={formatDateLong(slot.start)} />
          <Row label="Fin" value={formatDateLong(slot.end)} />
          <Row label="Precio por hora" value={formatPriceARS(court.pricePerHour)} />

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observaciones (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Datos adicionales para el complejo"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Confirmar reserva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-800">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </span>
    </div>
  );
}
