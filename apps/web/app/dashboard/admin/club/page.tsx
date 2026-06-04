/**
 * /dashboard/admin/club
 * ---------------------------------------------------------------------------
 * Edición de la información institucional del complejo (singleton ClubInfo).
 * Cambios visibles para todos los usuarios en la landing pública.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { ClubInfoDto } from '@/lib/types';

interface FormState {
  address: string;
  mapEmbedUrl: string;
  weekdayHours: string;
  weekendHours: string;
  holidayHours: string;
  servicesText: string; // un servicio por línea
}

function fromDto(dto: ClubInfoDto): FormState {
  return {
    address: dto.address,
    mapEmbedUrl: dto.mapEmbedUrl ?? '',
    weekdayHours: dto.weekdayHours,
    weekendHours: dto.weekendHours,
    holidayHours: dto.holidayHours,
    servicesText: dto.services.join('\n'),
  };
}

export default function AdminClubPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<FormState | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const infoQuery = useQuery({
    queryKey: ['admin-club-info'],
    queryFn: () => api<ClubInfoDto>('/club-info', { anonymous: true }),
  });

  React.useEffect(() => {
    if (infoQuery.data && !form) {
      setForm(fromDto(infoQuery.data));
    }
  }, [infoQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<ClubInfoDto>) =>
      api<ClubInfoDto>('/club-info', { method: 'PATCH', body: payload }),
    onSuccess: (updated) => {
      setSuccess('Información actualizada.');
      setError(null);
      setForm(fromDto(updated));
      // Invalidamos para que la landing vuelva a fetchear los datos al recargar.
      queryClient.invalidateQueries({ queryKey: ['admin-club-info'] });
    },
    onError: (e) => {
      setSuccess(null);
      setError(e instanceof ApiError ? e.message : 'No pudimos guardar los cambios.');
    },
  });

  if (!form || infoQuery.isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    const services = form.servicesText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    mutation.mutate({
      address: form.address.trim(),
      mapEmbedUrl: form.mapEmbedUrl.trim() || null,
      weekdayHours: form.weekdayHours.trim(),
      weekendHours: form.weekendHours.trim(),
      holidayHours: form.holidayHours.trim(),
      services,
    } as Partial<ClubInfoDto>);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
          <CardDescription>
            Dirección física y mapa de Google Maps embebido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Av. San Martín 1234, Reconquista, Santa Fe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mapEmbedUrl">URL del mapa (embed)</Label>
            <Input
              id="mapEmbedUrl"
              value={form.mapEmbedUrl}
              onChange={(e) => set('mapEmbedUrl', e.target.value)}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              En Google Maps: Compartir → Insertar un mapa → copiar el <code>src</code>{' '}
              del <code>&lt;iframe&gt;</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Horarios */}
      <Card>
        <CardHeader>
          <CardTitle>Horarios del club</CardTitle>
          <CardDescription>
            Texto libre — se muestra tal cual en la landing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="weekdayHours">Lunes a viernes</Label>
            <Input
              id="weekdayHours"
              value={form.weekdayHours}
              onChange={(e) => set('weekdayHours', e.target.value)}
              placeholder="13:00 a 23:00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weekendHours">Sábados y domingos</Label>
            <Input
              id="weekendHours"
              value={form.weekendHours}
              onChange={(e) => set('weekendHours', e.target.value)}
              placeholder="13:00 a 23:00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holidayHours">Feriados</Label>
            <Input
              id="holidayHours"
              value={form.holidayHours}
              onChange={(e) => set('holidayHours', e.target.value)}
              placeholder="13:00 a 23:00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Servicios */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios del club</CardTitle>
          <CardDescription>
            Un servicio por línea. Algunos nombres reciben íconos automáticos: Wi-Fi,
            Vestuario, Bar, Parrilla, Torneos, Escuelita, Quincho, Cumpleaños,
            Estacionamiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="services">Servicios disponibles</Label>
          <textarea
            id="services"
            value={form.servicesText}
            onChange={(e) => set('servicesText', e.target.value)}
            rows={8}
            className={
              'mt-1.5 w-full rounded-lg border px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 ' +
              'border-zinc-200 bg-white text-zinc-900 ' +
              'shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.02)] ' +
              'placeholder:text-zinc-400 ' +
              'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 ' +
              'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-none ' +
              'dark:placeholder:text-zinc-500 dark:focus:ring-brand-500/20'
            }
            placeholder={'Wi-Fi\nVestuario\nBar / Restaurante\nDisposición de paletas'}
          />
        </CardContent>
      </Card>

      {/* Mensajes y botón */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
          {success}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={mutation.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
