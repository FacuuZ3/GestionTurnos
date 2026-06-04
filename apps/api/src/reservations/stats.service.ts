/**
 * StatsService
 * ===========================================================================
 *  Calcula métricas agregadas sobre las reservas de los últimos N días.
 *
 *  Métricas:
 *   - Totales por estado (CONFIRMED / CANCELLED / PENDING).
 *   - Facturación estimada (Σ horas × precio/h) total y por cancha.
 *   - Top 5 clientes por cantidad de reservas no canceladas.
 *   - Tasa de ocupación por cancha (% de las horas disponibles realmente usadas).
 *   - Heatmap día-de-semana × slot-start (popularidad por horario).
 *
 *  Decisión académica: las métricas se calculan in-memory tras un findMany
 *  acotado al período. Para datasets pequeños/medianos (un complejo de pádel)
 *  esto es perfectamente eficiente. En escala mayor convendría materializar
 *  vistas o usar consultas agregadas SQL.
 *
 *  REFERENCIA INFORME - Capítulo 5: Implementación
 *  Sección: Subsistema de reporting y análisis
 *  Diagrama relacionado: Componentes del módulo de estadísticas
 */

import { Injectable } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Horas operativas disponibles por día por cancha.
 * 6 slots × 1.5 h = 9 horas/día (sincronizado con BookingPolicy).
 */
const HOURS_PER_DAY_PER_COURT = 9;

export interface StatsResponse {
  range: { from: string; to: string; days: number };
  totals: { confirmed: number; cancelled: number; pending: number };
  revenue: {
    total: number;
    byCourt: Array<{
      courtId: string;
      courtName: string;
      hours: number;
      revenue: number;
    }>;
  };
  topUsers: Array<{ userId: string; name: string; email: string; count: number }>;
  occupancy: Array<{
    courtId: string;
    courtName: string;
    hoursReserved: number;
    hoursTotal: number;
    rate: number;
  }>;
  /** Pares dayOfWeek (0-6) × startMinute con cantidad de ocurrencias. */
  heatmap: Array<{ dayOfWeek: number; startMinute: number; count: number }>;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(daysParam: number | undefined): Promise<StatsResponse> {
    const days = daysParam ?? 30;

    // Ventana temporal [from, to].
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    // -----------------------------------------------------------------------
    // Totales por estado
    // -----------------------------------------------------------------------
    const [confirmed, cancelled, pending] = await Promise.all([
      this.prisma.reservation.count({
        where: { status: ReservationStatus.CONFIRMED, startTime: { gte: from, lt: to } },
      }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.CANCELLED, startTime: { gte: from, lt: to } },
      }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.PENDING, startTime: { gte: from, lt: to } },
      }),
    ]);

    // -----------------------------------------------------------------------
    // Cargamos las reservas confirmadas + cancha para calcular métricas in-memory.
    // Cancelled NO suman a facturación / ocupación / heatmap.
    // -----------------------------------------------------------------------
    const confirmedRes = await this.prisma.reservation.findMany({
      where: { status: ReservationStatus.CONFIRMED, startTime: { gte: from, lt: to } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        court: { select: { id: true, name: true, pricePerHour: true } },
      },
    });

    // -----------------------------------------------------------------------
    // Facturación estimada total + por cancha
    // -----------------------------------------------------------------------
    const byCourtMap = new Map<
      string,
      { courtId: string; courtName: string; hours: number; revenue: number }
    >();
    let totalRevenue = 0;

    for (const r of confirmedRes) {
      const hours = (r.endTime.getTime() - r.startTime.getTime()) / (3600 * 1000);
      const price = Number(r.court.pricePerHour);
      const revenue = hours * price;
      totalRevenue += revenue;

      const cur = byCourtMap.get(r.courtId) ?? {
        courtId: r.courtId,
        courtName: r.court.name,
        hours: 0,
        revenue: 0,
      };
      cur.hours += hours;
      cur.revenue += revenue;
      byCourtMap.set(r.courtId, cur);
    }

    const byCourt = Array.from(byCourtMap.values())
      .map((c) => ({ ...c, hours: round2(c.hours), revenue: round2(c.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);

    // -----------------------------------------------------------------------
    // Top 5 clientes por cantidad de reservas confirmadas
    // -----------------------------------------------------------------------
    const userCounts = new Map<
      string,
      { userId: string; name: string; email: string; count: number }
    >();
    for (const r of confirmedRes) {
      const cur = userCounts.get(r.userId) ?? {
        userId: r.userId,
        name: r.user.name,
        email: r.user.email,
        count: 0,
      };
      cur.count += 1;
      userCounts.set(r.userId, cur);
    }
    const topUsers = Array.from(userCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // -----------------------------------------------------------------------
    // Ocupación por cancha (incluye también canchas sin reservas)
    // -----------------------------------------------------------------------
    const courts = await this.prisma.court.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const hoursTotal = days * HOURS_PER_DAY_PER_COURT;

    const occupancy = courts
      .map((c) => {
        const reserved = byCourtMap.get(c.id)?.hours ?? 0;
        const rate = hoursTotal === 0 ? 0 : (reserved / hoursTotal) * 100;
        return {
          courtId: c.id,
          courtName: c.name,
          hoursReserved: round2(reserved),
          hoursTotal: round2(hoursTotal),
          rate: round2(rate),
        };
      })
      .sort((a, b) => b.rate - a.rate);

    // -----------------------------------------------------------------------
    // Heatmap día de la semana × slot start
    // -----------------------------------------------------------------------
    const heatmapMap = new Map<string, number>();
    for (const r of confirmedRes) {
      const day = r.startTime.getDay();
      const min = r.startTime.getHours() * 60 + r.startTime.getMinutes();
      const key = `${day}-${min}`;
      heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
    }
    const heatmap = Array.from(heatmapMap.entries()).map(([key, count]) => {
      const [d, m] = key.split('-').map(Number);
      return { dayOfWeek: d, startMinute: m, count };
    });

    return {
      range: { from: from.toISOString(), to: to.toISOString(), days },
      totals: { confirmed, cancelled, pending },
      revenue: { total: round2(totalRevenue), byCourt },
      topUsers,
      occupancy,
      heatmap,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
