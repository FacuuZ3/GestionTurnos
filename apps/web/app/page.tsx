/**
 * Landing Page pública.
 * ---------------------------------------------------------------------------
 * Estructura:
 *   1. Hero a dos columnas (texto + foto del complejo).
 *   2. "Nuestras canchas" con cards visuales.
 *   3. "Donde estamos" — ubicación + horarios + servicios.
 *   4. Footer con links.
 */

import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClubInfoSection } from '@/components/landing/club-info';
import { HeroCTAs } from '@/components/landing/hero-ctas';
import { CourtImage } from '@/components/landing/court-image';
import { ClubInfoDto, CourtDto } from '@/lib/types';
import { formatPriceARS } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Imágenes locales servidas desde apps/web/public/canchas/.
 * ---------------------------------------------------------------------------
 * Reemplazo de loremflickr (devolvía fotos aleatorias inestables). Las
 * imágenes deben colocarse en apps/web/public/canchas/ y se referencian con
 * rutas absolutas desde la raíz pública.
 *
 *   - hero.jpg            → foto principal del Hero.
 *   - cancha-N.jpg        → opcionales para las cards de canchas. Si no
 *                           existen, se cae a hero.jpg como fallback.
 */
const HERO_IMAGE = '/canchas/hero.jpg';
const COURT_FALLBACK_IMAGE = '/canchas/hero.jpg';

/**
 * Imagen para una card de cancha individual.
 *
 * Por defecto devuelve `hero.jpg` para que TODAS las cards muestren la
 * misma foto institucional (suficiente para el demo / informe).
 *
 * Para habilitar fotos distintas por cancha:
 *   1) Subí `cancha-1.jpg`, `cancha-2.jpg`, `cancha-3.jpg` a /public/canchas/.
 *   2) Reemplazá el cuerpo de esta función por la distribución
 *      determinística comentada abajo.
 */
function courtImageFor(_seed: string, _index: number): string {
  return HERO_IMAGE;

  // -- Variante con fotos distintas por cancha (requiere los 3 archivos):
  // const variants = ['/canchas/cancha-1.jpg', '/canchas/cancha-2.jpg', '/canchas/cancha-3.jpg'];
  // const pick = (_seed.charCodeAt(0) + _index) % variants.length;
  // return variants[pick];
}

async function fetchCourts(): Promise<CourtDto[]> {
  try {
    const res = await fetch(`${API_BASE}/api/courts`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return (await res.json()) as CourtDto[];
  } catch {
    return [];
  }
}

async function fetchClubInfo(): Promise<ClubInfoDto | null> {
  try {
    const res = await fetch(`${API_BASE}/api/club-info`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as ClubInfoDto;
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [courts, clubInfo] = await Promise.all([fetchCourts(), fetchClubInfo()]);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">
      <Hero />
      <CourtsSection courts={courts} />
      {clubInfo && <ClubInfoSection info={clubInfo} />}
      <Footer info={clubInfo} />
    </div>
  );
}

// ============================================================================
//  HERO
// ============================================================================

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 via-white to-zinc-50 dark:from-brand-900/20 dark:via-zinc-950 dark:to-zinc-950" />

      <div className="container grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-12 lg:py-28">
        {/* Texto */}
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1 text-xs font-medium text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-pulse" />
            Reservas online · 13 a 23 hs · Confirmación inmediata
          </span>

          <h1 className="mt-6 text-5xl font-semibold leading-[0.95] tracking-tighter text-zinc-950 md:text-7xl dark:text-zinc-50">
            Tu cancha,
            <br />
            <span className="text-brand-700 dark:text-brand-400">en tres clicks.</span>
          </h1>

          <p className="mt-6 max-w-[55ch] text-base leading-relaxed text-zinc-600 md:text-lg dark:text-zinc-400">
            Elegí día y horario, confirmá tu turno y recibilo en tu email. Sin
            llamados, sin esperas. El pago se realiza en el complejo al momento
            de jugar.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <HeroCTAs />
          </div>

          {/* Métricas */}
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <Metric value="6" label="turnos por día" />
            <Metric value="90'" label="por reserva" />
            <Metric value="24/7" label="reservá online" />
          </dl>
        </div>

        {/* Imagen */}
        <div className="lg:col-span-5">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-zinc-200 shadow-xl dark:border-zinc-800 dark:shadow-zinc-950/50">
      <img
        src={HERO_IMAGE}
        alt="Cancha de pádel"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-900/40 via-transparent to-transparent" />
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-mono text-2xl font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </dt>
      <dd className="mt-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </dd>
    </div>
  );
}

// ============================================================================
//  CANCHAS
// ============================================================================

function CourtsSection({ courts }: { courts: CourtDto[] }) {
  return (
    <section
      id="canchas"
      className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="container py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-brand-700 dark:text-brand-400">
              / canchas
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl dark:text-zinc-50">
              Explorá nuestros complejos
            </h2>
          </div>
          <Link
            href="/register"
            className="hidden text-sm font-medium text-brand-700 underline-offset-4 hover:underline md:block dark:text-brand-400"
          >
            Reservar ahora →
          </Link>
        </div>

        {courts.length === 0 ? (
          <EmptyCourts />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courts.map((c, i) => (
              <CourtCard key={c.id} court={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CourtCard({ court, index }: { court: CourtDto; index: number }) {
  const rating = 4.5 + ((court.id.charCodeAt(0) % 5) * 0.1);
  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:hover:shadow-zinc-950/50">
      <div className="relative aspect-[4/3] overflow-hidden">
        <CourtImage
          src={courtImageFor(court.id, index)}
          fallbackSrc={COURT_FALLBACK_IMAGE}
          alt={court.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-zinc-800 backdrop-blur dark:bg-zinc-900/90 dark:text-zinc-100">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {rating.toFixed(1)}
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {court.name}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <MapPin className="h-3 w-3" />
          {court.description ?? 'Av. San Martín 1234, Reconquista'}
        </p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <span className="font-mono text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
              {formatPriceARS(court.pricePerHour)}
            </span>
            <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">/hora</span>
          </div>
          <Link href="/register">
            <Button size="sm" variant="outline">
              Ver horarios
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyCourts() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No hay canchas habilitadas. Volvé pronto.
      </p>
    </div>
  );
}

// ============================================================================
//  FOOTER
// ============================================================================

function Footer({ info }: { info: ClubInfoDto | null }) {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="container py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-brand-700 dark:text-brand-400">
              / contacto
            </p>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              hola@padelturnos.local · +54 9 3482 47-1928
            </p>
            {info && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {info.address}
              </p>
            )}
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="#canchas" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Canchas
            </Link>
            <Link
              href="#donde-estamos"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Donde estamos
            </Link>
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Ingresar
            </Link>
            <Link href="/register" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Crear cuenta
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row dark:border-zinc-800 dark:text-zinc-400">
          <span>© {new Date().getFullYear()} Pádel Turnos</span>
          <span className="font-mono">Proyecto Final · TUP · UTN FRRq</span>
        </div>
      </div>
    </footer>
  );
}
