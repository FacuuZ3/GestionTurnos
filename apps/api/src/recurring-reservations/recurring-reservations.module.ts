/**
 * RecurringReservationsModule: agrupa controller + service.
 * Expone el servicio porque ReservationsService lo necesita para integrar
 * los bloqueos recurrentes en la lógica de disponibilidad y creación.
 */

import { Module } from '@nestjs/common';
import { RecurringReservationsController } from './recurring-reservations.controller';
import { RecurringReservationsService } from './recurring-reservations.service';

@Module({
  controllers: [RecurringReservationsController],
  providers: [RecurringReservationsService],
  exports: [RecurringReservationsService],
})
export class RecurringReservationsModule {}
