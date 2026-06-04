/**
 * AvailabilityQueryDto: query params de GET /reservations/availability.
 *
 *   /reservations/availability?courtId=<uuid>&date=YYYY-MM-DD
 */

import { IsISO8601, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID('4', { message: 'courtId debe ser un UUID válido.' })
  courtId!: string;

  /**
   * Fecha del día consultado (cualquier ISO 8601 válido). El servicio
   * normaliza al rango [00:00, 24:00) de esa fecha en el huso del servidor.
   */
  @IsISO8601({}, { message: 'date debe estar en formato ISO 8601 (YYYY-MM-DD).' })
  date!: string;
}
