/**
 * Navbar: barra superior persistente con soporte claro/oscuro.
 *  - Re-lee el usuario del localStorage cuando cambia la ruta.
 *  - Escucha eventos 'storage' para sincronizar logout entre pestañas.
 *  - Para rol USER, agrega un atajo "Reservar" directo al flujo de booking.
 *  - Incluye el ThemeToggle.
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from './ui/button';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { clearSession, getRole, getStoredUser } from '@/lib/auth';
import { UserDto } from '@/lib/types';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<UserDto | null>(null);

  React.useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  React.useEffect(() => {
    const handler = () => setUser(getStoredUser());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const logout = () => {
    clearSession();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const role = getRole();
  const isAdmin = role === 'ADMIN';

  return (
    <header
      className={
        'sticky top-0 z-30 backdrop-blur-md ' +
        'border-b border-zinc-200/80 bg-white/80 ' +
        'dark:border-zinc-800/80 dark:bg-zinc-950/80'
      }
    >
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="text-brand-700 transition-opacity hover:opacity-80 dark:text-brand-500"
        >
          <Logo />
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-300">
                Hola, {user.name.split(' ')[0]}
              </span>

              {isAdmin ? (
                <Link href="/dashboard/admin">
                  <Button variant="ghost">Panel</Button>
                </Link>
              ) : (
                <Link href="/dashboard/user">
                  <Button variant="ghost">Mis reservas</Button>
                </Link>
              )}

              {/* Tanto USER como ADMIN pueden reservar. El admin lo hace
                  desde su propio panel (timeline interactiva), así que su
                  acceso a /dashboard/user/reservar no es necesario, pero
                  lo mantenemos para flexibilidad. */}
              {!isAdmin && (
                <Link href="/dashboard/user/reservar">
                  <Button variant="ghost">Reservar</Button>
                </Link>
              )}

              <Link href="/dashboard/user/profile">
                <Button variant="ghost">Mi cuenta</Button>
              </Link>
              <Button variant="outline" onClick={logout}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Ingresar</Button>
              </Link>
              <Link href="/register">
                <Button>Registrarme</Button>
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
