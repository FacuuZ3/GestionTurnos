/**
 * /login - inicio de sesión.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { loginSchema, LoginValues } from '@/lib/schemas';
import { saveSession } from '@/lib/auth';
import { LoginResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: values,
        anonymous: true,
      });
      saveSession({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
      router.push(res.user.role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user');
      router.refresh();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Error inesperado.');
    }
  };

  return (
    <div className="container flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">
            / login
          </p>
          <CardTitle className="mt-2 text-2xl">Ingresar</CardTitle>
          <CardDescription>Accedé con tu cuenta para gestionar tus turnos.</CardDescription>
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Olvidé mi contraseña
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>
            {serverError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
              Ingresar
            </Button>
            <p className="text-xs text-zinc-500">
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="font-medium text-brand-700 hover:underline">
                Registrate
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
