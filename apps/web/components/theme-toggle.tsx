/**
 * ThemeToggle: botón sol/luna que alterna entre claro y oscuro.
 *
 * Detalles:
 *  - Usa next-themes (hook useTheme).
 *  - Renderiza un placeholder hasta que el componente se monta para evitar
 *    hydration mismatch (el theme real lo conoce sólo el cliente).
 *  - Cycle: light → dark (no incluye "system" en el toggle para mantenerlo
 *    binario; el default sigue siendo "system" en el primer ingreso).
 */

'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md',
        'border border-zinc-200 bg-white text-zinc-700',
        'hover:bg-zinc-100',
        'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
        'transition-colors active:scale-95',
        className,
      )}
    >
      {/* Mientras no esté montado renderizamos un placeholder transparente
          del mismo tamaño para que el botón no "salte" al hidratar. */}
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
