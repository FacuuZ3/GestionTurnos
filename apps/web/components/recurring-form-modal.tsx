/**
 * RecurringFormModal: alta de turnos fijos semanales (ADMIN).
 */

'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { CourtDto, RecurringReservationDto } from '@/lib/types';

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const recurringSchema = z
  .object({
    courtId: z.string().uuid('Seleccioná una cancha.'),
    dayOfWeek: z.coerce.number().min(0).max(6),
    /** Hora en formato HH:MM */
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM.'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM.'),
    notes: z.string().max(500).optional().or(z.literal('')),
  })
  .refine((d) => timeToMinutes(d.startTime) < timeToMinutes(d.endTime), {
    message: 'El inicio debe ser anterior al fin.',
    path: ['endTime'],
  });

type RecurringValues = z.infer<typeof recurringSchema>;

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courts: CourtDto[];
}

export function RecurringFormModal({ open, onOpenChange, courts }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<RecurringValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      courtId: courts[0]?.id ?? '',
      dayOfWeek: 1,
      startTime: '13:00',
      endTime: '14:30',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (open && courts.length > 0 && !form.getValues('courtId')) {
      form.setValue('courtId', courts[0].id);
    }
    setError(null);
  }, [open, courts, form]);

  const mutation = useMutation({
    mutationFn: (values: RecurringValues) =>
      api<RecurringReservationDto>('/recurring-reservations', {
        method: 'POST',
        body: {
          courtId: values.courtId,
          dayOfWeek: values.dayOfWeek,
          startMinute: timeToMinutes(values.startTime),
          endMinute: timeToMinutes(values.endTime),
          notes: values.notes || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      onOpenChange(false);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'No pudimos crear el turno fijo.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo turno fijo</DialogTitle>
          <DialogDescription>
            Bloquea automáticamente este horario todas las semanas.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="courtId">Cancha</Label>
            <select
              id="courtId"
              className={
                'h-10 w-full rounded-lg border px-3 text-sm transition-colors ' +
                'border-zinc-200 bg-white text-zinc-900 ' +
                'hover:border-zinc-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 ' +
                'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700 dark:focus:ring-brand-500/20'
              }
              {...form.register('courtId')}
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {form.formState.errors.courtId && (
              <p className="text-xs text-red-600">{form.formState.errors.courtId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dayOfWeek">Día de la semana</Label>
            <select
              id="dayOfWeek"
              className={
                'h-10 w-full rounded-lg border px-3 text-sm transition-colors ' +
                'border-zinc-200 bg-white text-zinc-900 ' +
                'hover:border-zinc-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 ' +
                'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700 dark:focus:ring-brand-500/20'
              }
              {...form.register('dayOfWeek')}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Inicio</Label>
              <Input id="startTime" type="time" step={1800} {...form.register('startTime')} />
              {form.formState.errors.startTime && (
                <p className="text-xs text-red-600">{form.formState.errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Fin</Label>
              <Input id="endTime" type="time" step={1800} {...form.register('endTime')} />
              {form.formState.errors.endTime && (
                <p className="text-xs text-red-600">{form.formState.errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observación (opcional)</Label>
            <Input id="notes" placeholder="Ej.: Escuela de pádel" {...form.register('notes')} />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Crear turno fijo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
