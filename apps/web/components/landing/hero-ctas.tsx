/**
 * HeroCTAs
 * ---------------------------------------------------------------------------
 * Bloque de CTAs del hero. Cambia según haya sesión activa:
 *   - Anónimo: "Crear cuenta" + "Ya tengo cuenta".
 *   - Logueado: un único "Reservar ahora" hacia su dashboard según rol.
 *
 * Es Client Component porque la sesión vive en cookies/localStorage que sólo
 * existen en el browser. Se renderiza un placeholder mientras no está
 * montado para evitar hydration mismatch.
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRole, getStoredUser } from '@/lib/auth';
import { UserDto } from '@/lib/types';

export function HeroCTAs() {
  const [mounted, setMounted] = React.useState(false);
  const [user, setUser] = React.useState<UserDto | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
  }, []);

  // Placeholder de altura fija para evitar layout shift en el hidrato.
  if (!mounted) {
    return <div className="h-12" />;
  }

  if (user) {
    const role = getRole();
    const href = role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user';
    return (
      <Link href={href}>
        <Button size="lg">
          Reservar ahora
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/register">
        <Button size="lg">
          Crear cuenta
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link href="/login">
        <Button size="lg" variant="outline">
          Ya tengo cuenta
        </Button>
      </Link>
    </>
  );
}
