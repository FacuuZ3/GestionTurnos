/**
 * /reset-password?token=...
 * ---------------------------------------------------------------------------
 * Página de destino del email de reseteo. El usuario define su nueva
 * contraseña (con confirmación) y se invalida el token.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { resetPasswordSchema, ResetPasswordValues } from '@/lib/schemas';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setServerError(null);
    setSuccess(null);
    if (!token) {
      setServerError('Falta el token. Pedí un enlace nuevo desde "Olvidé mi contraseña".');
      return;
    }
    try {
      const res = await api<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword: values.newPassword },
        anonymous: true,
      });
      setSuccess(res.message);
      form.reset();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Error inesperado.');
    }
  };

  return (
    <div className="container flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">
            / nueva contraseña
          </p>
          <CardTitle className="mt-2 text-2xl">Definí tu nueva contraseña</CardTitle>
          <CardDescription>
            El enlace caduca a la hora. Si vencer, pedí uno nuevo.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...form.register('newPassword')}
              />
              {form.formState.errors.newPassword && (
                <p className="text-xs text-red-600">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
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
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
              Cambiar contraseña
            </Button>
            <p className="text-xs text-zinc-500">
              <Link href="/login" className="font-medium text-brand-700 hover:underline">
                Ir al login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
