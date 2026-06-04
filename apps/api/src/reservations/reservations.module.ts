/**
 * ReservationsModule
 * ---------------------------------------------------------------------------
 * Compone el controlador, el servicio y declara la dependencia de
 * CourtsModule (verificación de cancha activa).
 */

import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReminderService } from './reminder.service';
import { StatsService } from './stats.service';
import { CourtsModule } from '../courts/courts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CourtsModule, NotificationsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReminderService, StatsService],
  exports: [ReservationsService, ReminderService, StatsService],
})
export class ReservationsModule {}
