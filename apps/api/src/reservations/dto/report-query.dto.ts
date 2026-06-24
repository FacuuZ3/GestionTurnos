/**
 * ReportQueryDto: filtros opcionales para el reporte de reservas
 * (GET /reservations/report.pdf y POST /reservations/report/email).
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2026-06-23', description: 'Día a reportar (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD.' })
  date?: string;

  @ApiPropertyOptional({ description: 'UUID de la cancha.' })
  @IsOptional()
  @IsUUID('4', { message: 'courtId debe ser un UUID válido.' })
  courtId?: string;

  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional()
  @IsEnum(ReservationStatus, { message: 'Estado inválido.' })
  status?: ReservationStatus;
}
