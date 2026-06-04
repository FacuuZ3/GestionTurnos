/**
 * /dashboard/user/profile
 * ---------------------------------------------------------------------------
 * Dos cards independientes:
 *   1. Datos del perfil (nombre, teléfono): PATCH /users/me
 *   2. Cambio de contraseña (actual + nueva + confirmación): POST /users/me/change-password
 *
 * Por separado para que el usuario pueda editar uno sin tocar el otro.
 */

'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { UserDto } from '@/lib/types';
import {
  changePasswordSchema,
  ChangePasswordValues,
  updateProfileSchema,
  UpdateProfileValues,
} from '@/lib/schemas';

export default function ProfilePage() {
  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">
          / cuenta
        </p>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Mi perfil</h1>
        <p className="text-sm text-zinc-500">
          Editá tus datos personales y la contraseña de acceso.
        </p>
      </header>

      <ProfileForm />
      <PasswordForm />
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Formulario de datos del perfil
// ---------------------------------------------------------------------------

function ProfileForm() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api<UserDto>('/users/me'),
  });

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: '', phone: '' },
  });

  React.useEffect(() => {
    if (meQuery.data) {
      form.reset({
        name: meQuery.data.name,
        phone: meQuery.data.phone ?? '',
      });
    }
  }, [meQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (values: UpdateProfileValues) =>
      api<UserDto>('/users/me', {
        method: 'PATCH',
        body: { ...values, phone: values.phone || undefined },
      }),
    onSuccess: (updated) => {
      setSuccess('Datos guardados.');
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      // Refrescamos también el "user" en localStorage para que el navbar use
      // el nombre actualizado.
      saveSession(
        {
          accessToken: getCookie('padel_at') ?? '',
          refreshToken: getCookie('padel_rt') ?? '',
        },
        updated,
      );
    },
    onError: (e) =>
      setServerError(e instanceof ApiError ? e.message : 'No pudimos guardar los cambios.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>El email no es editable.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={meQuery.data?.email ?? ''} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre y apellido</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="+543482..." {...form.register('phone')} />
            {form.formState.errors.phone && (
              <p className="text-xs text-red-600">{form.formState.errors.phone.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
              {success}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={mutation.isPending}>
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  Formulario de cambio de contraseña
// ---------------------------------------------------------------------------

function PasswordForm() {
  const [success, setSuccess] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      api<{ message: string }>('/users/me/change-password', {
        method: 'POST',
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      }),
    onSuccess: (res) => {
      setSuccess(res.message);
      setServerError(null);
      form.reset();
    },
    onError: (e) =>
      setServerError(e instanceof ApiError ? e.message : 'No pudimos cambiar la contraseña.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>Por seguridad, pedimos tu contraseña actual.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Contraseña actual</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...form.register('currentPassword')}
            />
            {form.formState.errors.currentPassword && (
              <p className="text-xs text-red-600">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('newPassword')}
            />
            {form.formState.errors.newPassword && (
              <p className="text-xs text-red-600">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-red-600">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
              {success}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={mutation.isPending}>
              Cambiar contraseña
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  Util local: leer cookie (evita import de @/lib/auth si quisiéramos
//  romper la circular en el futuro).
// ---------------------------------------------------------------------------

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
