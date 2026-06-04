/**
 * NotificationsModule
 * ---------------------------------------------------------------------------
 * Agrupa el servicio orquestador, los canales concretos y los listeners de
 * eventos. Exporta NotificationsService para que el módulo de Auth y otros
 * puedan dispararlo de forma directa cuando no se justifique un evento.
 */

import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailChannel } from './channels/email.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { ReservationListener } from './listeners/reservation.listener';

@Module({
  providers: [EmailChannel, WhatsAppChannel, NotificationsService, ReservationListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
