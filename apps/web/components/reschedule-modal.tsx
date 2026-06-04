/**
 * RescheduleModal: ADMIN puede mover un turno a una nueva ventana.
 */

'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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
import { ReservationDto } from '@/lib/types';
import { formatDateLong } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservation: ReservationDto | null;
}

export function RescheduleModal({ open, onOpenChange, reservation }: Props) {
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (reservation) {
      setStartTime(format(new Date(reservation.startTime), "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(new Date(reservation.endTime), "yyyy-MM-dd'T'HH:mm"));
      setError(null);
    }
  }, [reservation]);

  const mutation = useMutation({
    mutationFn: () =>
      api<ReservationDto>(`/reservations/${reservation!.id}/reschedule`, {
        method: 'PATCH',
        body: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
      onOpenChange(false);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'No pudimos reprogramar el turno.'),
  });

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprogramar turno</DialogTitle>
          <DialogDescription>
            Actual: {formatDateLong(reservation.startTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="start">Nuevo inicio</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">Nuevo fin</Label>
            <Input
              id="end"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
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
            Confirmar cambio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
