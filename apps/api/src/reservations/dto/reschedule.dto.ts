/**
 * RescheduleReservationDto: payload de PATCH /reservations/:id/reschedule.
 * Permite a un ADMIN mover un turno a una nueva ventana horaria sobre
 * la misma cancha (la cancha se mantiene fija para no romper la
 * trazabilidad histórica del precio).
 */

import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class RescheduleReservationDto {
  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @Type(() => Date)
  @IsDate()
  endTime!: Date;
}
