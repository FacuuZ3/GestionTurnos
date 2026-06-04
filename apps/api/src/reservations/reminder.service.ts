/**
 * ReminderService
 * ===========================================================================
 * Despacha recordatorios por email para los turnos que arrancan en menos de
 * 25 horas. Se ejecuta automáticamente cada hora vía @nestjs/schedule.
 *
 * Idempotencia:
 *   El campo Reservation.reminderSent garantiza que cada reserva reciba un
 *   único recordatorio aún si el cron job se dispara dos veces o si el
 *   servidor se reinicia entre ejecuciones.
 *
 * Tolerancia a fallos:
 *   Si el envío de email falla, NO marcamos reminderSent=true, de modo que
 *   el siguiente tick lo vuelva a intentar. Si el email se envía pero el
 *   update de la base falla, podríamos enviar el recordatorio dos veces;
 *   ese riesgo es aceptable para el alcance del proyecto.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Procesamiento asíncrono y jobs programados
 * Diagrama relacionado: Diagrama de Secuencia "Recordatorio programado"
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Ventana de tiempo que mira el job: turnos que arrancan a más tardar dentro
 * de N horas. Si el cron se atrasa o se pierde un tick, el siguiente cubre
 * lo que faltó. Combinado con reminderSent garantiza "at-most-once" (o "at-
 * least-once con dedup") sin pérdidas.
 */
const REMINDER_WINDOW_HOURS = 25;

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Tick automático: corre cada hora en punto (xx:00). Apropiado para una
   * granularidad de "recordatorio 24 hs antes".
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTick(): Promise<void> {
    const count = await this.runOnce();
    if (count > 0) {
      this.logger.log(`Recordatorios enviados en este tick: ${count}.`);
    }
  }

  /**
   * Ejecuta un ciclo de envíos. Devuelve la cantidad enviada.
   * Expuesto como método público para poder dispararlo manualmente desde
   * un endpoint admin (útil en demos del proyecto final).
   */
  async runOnce(): Promise<number> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3600 * 1000);

    const pending = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        reminderSent: false,
        startTime: { gt: now, lte: windowEnd },
      },
      include: { user: true, court: true },
    });

    if (pending.length === 0) return 0;

    let ok = 0;
    for (const r of pending) {
      try {
        await this.notifications.sendReservationReminder(
          r.user.email,
          r.user.name,
          r.court.name,
          r.startTime,
        );
        await this.prisma.reservation.update({
          where: { id: r.id },
          data: { reminderSent: true },
        });
        ok += 1;
      } catch (err) {
        // No marcamos reminderSent: en el próximo tick reintentamos.
        this.logger.error(
          `Fallo enviando recordatorio para reserva ${r.id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    return ok;
  }
}
