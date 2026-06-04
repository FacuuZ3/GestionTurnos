/**
 * /register - alta de nuevo usuario.
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
import { registerSchema, RegisterValues } from '@/lib/schemas';

export default function RegisterPage() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  });

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    setSuccess(null);
    try {
      const payload = { ...values, phone: values.phone || undefined };
      const res = await api<{ message: string }>('/auth/register', {
        method: 'POST',
        body: payload,
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
            / registro
          </p>
          <CardTitle className="mt-2 text-2xl">Crear cuenta</CardTitle>
          <CardDescription>
            Recibirás un email para verificar tu cuenta antes de iniciar sesión.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <Field id="name" label="Nombre y apellido" error={form.formState.errors.name?.message}>
              <Input id="name" autoComplete="name" {...form.register('name')} />
            </Field>
            <Field id="email" label="Email" error={form.formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            </Field>
            <Field
              id="phone"
              label="Teléfono (opcional)"
              error={form.formState.errors.phone?.message}
            >
              <Input
                id="phone"
                inputMode="tel"
                placeholder="+543482..."
                autoComplete="tel"
                {...form.register('phone')}
              />
            </Field>
            <Field
              id="password"
              label="Contraseña"
              error={form.formState.errors.password?.message}
              hint="Mínimo 8 caracteres."
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register('password')}
              />
            </Field>

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
              Crear cuenta
            </Button>
            <p className="text-xs text-zinc-500">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="font-medium text-brand-700 hover:underline">
                Ingresar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
