/**
 * Logo: marca tipográfica + ícono SVG primitivo (no emoji).
 * Estilo: minimalista, monoline, alineado con la paleta emerald.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      {/* Raqueta estilizada */}
      <ellipse cx="9" cy="9" rx="6" ry="6" />
      <path d="M13.5 13.5 L20 20" />
      <path d="M5 9h8M9 5v8" strokeWidth="1.25" opacity="0.5" />
    </svg>
  );
}

export function Logo({ className, iconClassName }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <LogoMark className={iconClassName} />
      <span>Pádel Turnos</span>
    </span>
  );
}
