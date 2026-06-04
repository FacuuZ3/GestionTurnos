/**
 * /dashboard/admin/stats - Dashboard de métricas.
 * ---------------------------------------------------------------------------
 * Consume GET /reservations/stats?days=N y renderiza:
 *   - 4 KPIs grandes arriba (totales, confirmadas, facturación, ocupación).
 *   - Barras de facturación por cancha (Recharts).
 *   - Heatmap de popularidad día × horario (CSS grid coloreada).
 *   - Tabla Top 5 clientes.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Frontend - Subsistema de reporting
 */

'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { StatsResponse } from '@/lib/types';
import { formatPriceARS } from '@/lib/utils';

const DAY_NAMES_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const SLOT_STARTS = [780, 870, 960, 1050, 1140, 1230]; // 13:00..20:30 cada 90'

function minutesToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export default function AdminStatsPage() {
  const [days, setDays] = React.useState<7 | 30 | 90>(30);

  const statsQuery = useQuery({
    queryKey: ['admin-stats', days],
    queryFn: () => api<StatsResponse>('/reservations/stats', { query: { days } }),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-6">
      {/* Selector de rango */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Mostrando datos de los últimos{' '}
          <span className="font-mono tabular-nums text-zinc-900">{days}</span> días.
        </p>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as 7 | 30 | 90)}
              className={
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors ' +
                (days === d
                  ? 'bg-brand-600 text-white'
                  : 'text-zinc-700 hover:bg-zinc-100')
              }
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {statsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      )}

      {statsQuery.data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <KpiCard
              label="Reservas confirmadas"
              value={statsQuery.data.totals.confirmed.toString()}
              hint={`${statsQuery.data.totals.cancelled} canceladas · ${statsQuery.data.totals.pending} pendientes`}
            />
            <KpiCard
              label="Facturación estimada"
              value={formatPriceARS(statsQuery.data.revenue.total)}
              hint="suma de horas × precio/h"
            />
            <KpiCard
              label="Ocupación promedio"
              value={`${averageOccupancy(statsQuery.data).toFixed(1)}%`}
              hint="del total de horas disponibles"
            />
            <KpiCard
              label="Clientes únicos"
              value={statsQuery.data.topUsers.length.toString()}
              hint="con al menos una reserva"
            />
          </div>

          {/* Facturación por cancha */}
          <Card>
            <CardHeader>
              <CardTitle>Facturación por cancha</CardTitle>
              <CardDescription>Estimada en base a horas confirmadas × precio.</CardDescription>
            </CardHeader>
            <CardContent>
              {statsQuery.data.revenue.byCourt.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsQuery.data.revenue.byCourt}
                      margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis
                        dataKey="courtName"
                        tick={{ fontSize: 12, fill: '#52525b' }}
                        axisLine={{ stroke: '#e4e4e7' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#52525b' }}
                        axisLine={{ stroke: '#e4e4e7' }}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                        }
                      />
                      <Tooltip
                        cursor={{ fill: '#10b9811a' }}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e4e4e7',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => formatPriceARS(value)}
                      />
                      <Bar dataKey="revenue" fill="#059669" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Heatmap día × hora */}
          <Card>
            <CardHeader>
              <CardTitle>Horarios más populares</CardTitle>
              <CardDescription>
                Cuanto más oscuro, más reservas en ese día y horario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Heatmap data={statsQuery.data.heatmap} />
            </CardContent>
          </Card>

          {/* Ocupación por cancha */}
          <Card>
            <CardHeader>
              <CardTitle>Ocupación por cancha</CardTitle>
              <CardDescription>
                % de horas reservadas sobre el total operativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {statsQuery.data.occupancy.map((o) => (
                  <li key={o.courtId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-900">{o.courtName}</span>
                      <span className="font-mono text-xs tabular-nums text-zinc-600">
                        {o.hoursReserved} / {o.hoursTotal} hs · {o.rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.min(100, o.rate)}%` }}
                      />
                    </div>
                  </li>
                ))}
                {statsQuery.data.occupancy.length === 0 && <EmptyState />}
              </ul>
            </CardContent>
          </Card>

          {/* Top clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 clientes</CardTitle>
              <CardDescription>Por cantidad de reservas confirmadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {statsQuery.data.topUsers.length === 0 ? (
                <EmptyState />
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="py-2">#</th>
                      <th className="py-2">Cliente</th>
                      <th className="py-2 text-right">Reservas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {statsQuery.data.topUsers.map((u, i) => (
                      <tr key={u.userId}>
                        <td className="py-2 font-mono text-xs tabular-nums text-zinc-400">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums">{u.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Subcomponentes
// ---------------------------------------------------------------------------

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          {label}
        </p>
        <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-zinc-950">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Heatmap({
  data,
}: {
  data: Array<{ dayOfWeek: number; startMinute: number; count: number }>;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  // 1=lunes..6=sábado, 0=domingo (lo ponemos al final).
  const days = [1, 2, 3, 4, 5, 6, 0];

  const find = (day: number, min: number): number =>
    data.find((d) => d.dayOfWeek === day && d.startMinute === min)?.count ?? 0;

  const intensity = (n: number): string => {
    if (max === 0 || n === 0) return 'bg-zinc-100';
    const t = n / max;
    if (t < 0.2) return 'bg-brand-100';
    if (t < 0.4) return 'bg-brand-200';
    if (t < 0.6) return 'bg-brand-500';
    if (t < 0.8) return 'bg-brand-600';
    return 'bg-brand-700';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th />
            {SLOT_STARTS.map((m) => (
              <th
                key={m}
                className="text-center font-mono text-[10px] uppercase tracking-wider text-zinc-500"
              >
                {minutesToHHMM(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d}>
              <td className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {DAY_NAMES_SHORT[d]}
              </td>
              {SLOT_STARTS.map((m) => {
                const n = find(d, m);
                return (
                  <td key={m}>
                    <div
                      title={`${DAY_NAMES_SHORT[d]} ${minutesToHHMM(m)}: ${n} reserva(s)`}
                      className={
                        'h-9 rounded-md border border-zinc-200/60 flex items-center justify-center text-[11px] font-medium ' +
                        intensity(n) +
                        (n > 0 && n / max > 0.4 ? ' text-white' : ' text-zinc-700')
                      }
                    >
                      {n > 0 ? n : ''}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
      No hay datos para este rango.
    </p>
  );
}

function averageOccupancy(stats: StatsResponse): number {
  if (stats.occupancy.length === 0) return 0;
  const sum = stats.occupancy.reduce((acc, o) => acc + o.rate, 0);
  return sum / stats.occupancy.length;
}
