/**
 * CourtFormModal: alta y edición de canchas (ADMIN).
 * Reutiliza el mismo dialog para POST /courts y PATCH /courts/:id.
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
import { CourtDto, SportType } from '@/lib/types';

const courtSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres.').max(80),
  sportType: z.enum(['PADEL', 'TENNIS', 'FUTBOL']),
  description: z.string().max(500).optional().or(z.literal('')),
  pricePerHour: z.coerce.number().nonnegative('No puede ser negativo.'),
  isActive: z.boolean().default(true),
});
type CourtValues = z.infer<typeof courtSchema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  court: CourtDto | null; // null → modo alta
}

export function CourtFormModal({ open, onOpenChange, court }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<CourtValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: {
      name: '',
      sportType: 'PADEL',
      description: '',
      pricePerHour: 0,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (court) {
      form.reset({
        name: court.name,
        sportType: court.sportType,
        description: court.description ?? '',
        pricePerHour: Number(court.pricePerHour),
        isActive: court.isActive,
      });
    } else {
      form.reset({
        name: '',
        sportType: 'PADEL',
        description: '',
        pricePerHour: 0,
        isActive: true,
      });
    }
    setError(null);
  }, [court, open, form]);

  const mutation = useMutation({
    mutationFn: async (values: CourtValues) => {
      const payload = { ...values, description: values.description || undefined };
      if (court) {
        return api<CourtDto>(`/courts/${court.id}`, { method: 'PATCH', body: payload });
      }
      return api<CourtDto>('/courts', { method: 'POST', body: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courts'] });
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      onOpenChange(false);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No pudimos guardar la cancha.'),
  });

  const onSubmit = (values: CourtValues) => mutation.mutate(values);

  const sports: SportType[] = ['PADEL', 'TENNIS', 'FUTBOL'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{court ? 'Editar cancha' : 'Nueva cancha'}</DialogTitle>
          <DialogDescription>
            {court ? 'Modificá los datos y guardá los cambios.' : 'Completá los datos de la nueva cancha.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sportType">Deporte</Label>
              <select
                id="sportType"
                className={
                  'h-10 w-full rounded-lg border px-3 text-sm transition-colors ' +
                  'border-zinc-200 bg-white text-zinc-900 ' +
                  'hover:border-zinc-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 ' +
                  'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700 dark:focus:ring-brand-500/20'
                }
                {...form.register('sportType')}
              >
                {sports.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricePerHour">Precio / hora</Label>
              <Input
                id="pricePerHour"
                type="number"
                step="0.01"
                min={0}
                {...form.register('pricePerHour')}
              />
              {form.formState.errors.pricePerHour && (
                <p className="text-xs text-red-600">{form.formState.errors.pricePerHour.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" placeholder="Ej.: Blindex, techada, iluminación LED" {...form.register('description')} />
          </div>

          {/* Toggle switch para "Habilitada" - más visible que checkbox nativo */}
          <ActiveToggle
            checked={form.watch('isActive')}
            onChange={(v) => form.setValue('isActive', v, { shouldDirty: true })}
          />

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
              {court ? 'Guardar cambios' : 'Crear cancha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ActiveToggle: switch personalizado más legible que el checkbox nativo.
 * - Verde sólido cuando "Habilitada" está activo.
 * - Gris cuando está suspendida.
 * - Etiqueta explícita al lado para evitar ambigüedad.
 */
function ActiveToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {checked ? 'Cancha habilitada' : 'Cancha suspendida'}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {checked
            ? 'Aparece en la landing y acepta reservas.'
            : 'Visible en el panel admin pero no acepta reservas.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ' +
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ' +
          'dark:focus:ring-offset-zinc-900 ' +
          (checked ? 'bg-brand-600' : 'bg-zinc-300 dark:bg-zinc-700')
        }
      >
        <span
          className={
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ' +
            (checked ? 'translate-x-6' : 'translate-x-1')
          }
        />
      </button>
    </div>
  );
}
