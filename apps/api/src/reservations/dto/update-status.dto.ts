/**
 * UpdateStatusDto: payload de PATCH /reservations/:id/status (ADMIN).
 */

import { IsEnum } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;
}
