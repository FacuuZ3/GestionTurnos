/**
 * ClubInfoSection
 * ---------------------------------------------------------------------------
 * Tres bloques institucionales en la landing:
 *   - Ubicación + mapa (Google Maps embed si está configurado).
 *   - Horarios (días de semana / fin de semana / feriados).
 *   - Servicios del club (lista con íconos).
 *
 * Server Component — recibe los datos como prop (vienen del fetch SSR
 * del archivo page.tsx).
 */

import {
  MapPin,
  Clock,
  Wifi,
  Beer,
  Coffee,
  Trophy,
  Cake,
  Car,
  Flame,
  Users,
  PackageSearch,
  ShoppingBag,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import * as React from 'react';
import { ClubInfoDto } from '@/lib/types';

interface Props {
  info: ClubInfoDto;
}

/**
 * Mapeo "nombre del servicio" → ícono. Si no hay match, se cae al genérico.
 * Las claves se comparan en minúsculas y con tolerancia a tildes/espacios.
 */
function iconForService(label: string): React.ReactNode {
  const k = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (k.includes('wifi') || k.includes('wi-fi')) return <Wifi className="h-4 w-4" />;
  if (k.includes('vestuario')) return <Users className="h-4 w-4" />;
  if (k.includes('torneo')) return <Trophy className="h-4 w-4" />;
  if (k.includes('cumple')) return <Cake className="h-4 w-4" />;
  if (k.includes('parrilla') || k.includes('asado')) return <Flame className="h-4 w-4" />;
  if (k.includes('escuel')) return <GraduationCap className="h-4 w-4" />;
  if (k.includes('bar') || k.includes('restaurant')) return <Beer className="h-4 w-4" />;
  if (k.includes('quincho')) return <Coffee className="h-4 w-4" />;
  if (k.includes('paleta')) return <PackageSearch className="h-4 w-4" />;
  if (k.includes('estaciona') || k.includes('cochera')) return <Car className="h-4 w-4" />;
  if (k.includes('tienda') || k.includes('shop')) return <ShoppingBag className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

export function ClubInfoSection({ info }: Props) {
  return (
    <section
      id="donde-estamos"
      className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="container py-20">
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-widest text-brand-700 dark:text-brand-400">
            / donde estamos
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl dark:text-zinc-50">
            Conocé el complejo
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Mapa + dirección (columna ancha) */}
          <div className="lg:col-span-7">
            <MapBlock info={info} />
          </div>

          {/* Horarios y Servicios (columna lateral) */}
          <div className="space-y-6 lg:col-span-5">
            <HoursBlock info={info} />
            <ServicesBlock info={info} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
//  Bloque: mapa + dirección
// ============================================================================

function MapBlock({ info }: { info: ClubInfoDto }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-900">
        {info.mapEmbedUrl ? (
          <iframe
            src={info.mapEmbedUrl}
            title="Ubicación del complejo"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0"
          />
        ) : (
          <MapPlaceholder />
        )}
      </div>
      <div className="flex items-start gap-3 p-5">
        <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            ubicación
          </p>
          <p className="mt-1 text-base font-medium text-zinc-900 dark:text-zinc-50">
            {info.address}
          </p>
        </div>
      </div>
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 dark:from-brand-900/20 dark:to-zinc-950">
      <div className="text-center">
        <MapPin className="mx-auto h-10 w-10 text-brand-600/50" />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Mapa no configurado todavía
        </p>
      </div>
    </div>
  );
}

// ============================================================================
//  Bloque: horarios
// ============================================================================

function HoursBlock({ info }: { info: ClubInfoDto }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-brand-600" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          horarios del club
        </p>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        <HoursRow label="Lunes a viernes" value={info.weekdayHours} />
        <HoursRow label="Sábados y domingos" value={info.weekendHours} />
        <HoursRow label="Feriados" value={info.holidayHours} />
      </ul>
    </div>
  );
}

function HoursRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0 dark:border-zinc-800/60">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="font-mono text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </span>
    </li>
  );
}

// ============================================================================
//  Bloque: servicios
// ============================================================================

function ServicesBlock({ info }: { info: ClubInfoDto }) {
  if (info.services.length === 0) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          servicios del club
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {info.services.map((s) => (
          <li
            key={s}
            className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"
          >
            <span className="text-brand-600">{iconForService(s)}</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
