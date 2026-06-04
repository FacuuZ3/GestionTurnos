/**
 * /forgot-password
 * ---------------------------------------------------------------------------
 * Pide el email del usuario y dispara el envío del link de reseteo.
 * La respuesta del backend siempre es la misma exista o no la cuenta (anti
 * enumeración), por lo que mostramos un mensaje genérico de confirmación.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { forgotPasswordSchema, ForgotPasswordValues } from '@/lib/schemas';

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setServerError(null);
    setSuccess(null);
    try {
      const res = await api<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: values,
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
            / recuperar
          </p>
          <CardTitle className="mt-2 text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Ingresá tu email y te enviaremos un enlace para definir una nueva.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
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
              Enviar enlace
            </Button>
            <p className="text-xs text-zinc-500">
              <Link href="/login" className="font-medium text-brand-700 hover:underline">
                Volver al login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
