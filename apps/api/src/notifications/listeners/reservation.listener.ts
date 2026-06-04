/**
 * ReservationListener
 * ---------------------------------------------------------------------------
 * Suscriptor de eventos del dominio de reservas (patrón Observer).
 *  - 'reservation.confirmed' → envío de email de confirmación.
 *  - 'reservation.cancelled' → envío de email de cancelación.
 *
 * El payload completo de cada evento se define en ReservationsService (Paso 4).
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';

export interface ReservationEventPayload {
  userEmail: string;
  userName: string;
  courtName: string;
  startTime: Date;
}

@Injectable()
export class ReservationListener {
  private readonly logger = new Logger(ReservationListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent('reservation.confirmed', { async: true })
  async onConfirmed(payload: ReservationEventPayload): Promise<void> {
    this.logger.debug(`Evento reservation.confirmed para ${payload.userEmail}`);
    await this.notifications.sendReservationConfirmed(
      payload.userEmail,
      payload.userName,
      payload.courtName,
      payload.startTime,
    );
  }

  @OnEvent('reservation.cancelled', { async: true })
  async onCancelled(payload: ReservationEventPayload): Promise<void> {
    this.logger.debug(`Evento reservation.cancelled para ${payload.userEmail}`);
    await this.notifications.sendReservationCancelled(
      payload.userEmail,
      payload.userName,
      payload.courtName,
      payload.startTime,
    );
  }
}
