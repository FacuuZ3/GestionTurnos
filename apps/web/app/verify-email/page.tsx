/**
 * /verify-email?token=... - Página de destino del email de verificación.
 * Consume GET /auth/verify-email del backend y muestra el resultado.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = React.useState<Status>('idle');
  const [message, setMessage] = React.useState<string>('');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Falta el token de verificación.');
      return;
    }
    setStatus('loading');
    api<{ message: string }>(`/auth/verify-email`, {
      method: 'GET',
      anonymous: true,
      query: { token },
    })
      .then((r) => {
        setStatus('ok');
        setMessage(r.message);
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e instanceof ApiError ? e.message : 'Error inesperado.');
      });
  }, [token]);

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verificación de email</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Validando tu token...'}
            {status === 'ok' && '¡Listo!'}
            {status === 'error' && 'No pudimos verificar tu cuenta.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p
            className={
              status === 'error'
                ? 'rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'
                : 'rounded-md border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700'
            }
          >
            {message || '...'}
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/login">
            <Button>Ir al login</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
