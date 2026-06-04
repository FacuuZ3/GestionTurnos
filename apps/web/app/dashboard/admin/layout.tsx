/**
 * Layout del dashboard admin.
 * Provee navegación entre las dos áreas: reservas y canchas.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard/admin', label: 'Reservas' },
  { href: '/dashboard/admin/courts', label: 'Canchas' },
  { href: '/dashboard/admin/recurring', label: 'Turnos fijos' },
  { href: '/dashboard/admin/stats', label: 'Estadísticas' },
  { href: '/dashboard/admin/club', label: 'Club' },
  { href: '/dashboard/admin/audit', label: 'Auditoría' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Panel administrativo</h1>
        <p className="text-sm text-zinc-500">Gestioná las reservas y las canchas del complejo.</p>
      </header>

      <nav className="mb-6 inline-flex rounded-md border border-zinc-200 bg-white p-1 shadow-sm">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-zinc-700 hover:bg-zinc-100',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
