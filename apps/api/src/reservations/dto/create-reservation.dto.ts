/**
 * CreateReservationDto: payload de POST /reservations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ format: 'uuid', example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('4', { message: 'courtId debe ser un UUID válido.' })
  courtId!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-05-21T09:00:00.000Z' })
  @Type(() => Date)
  @IsDate({ message: 'startTime inválido.' })
  startTime!: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-05-21T10:30:00.000Z' })
  @Type(() => Date)
  @IsDate({ message: 'endTime inválido.' })
  endTime!: Date;

  @ApiPropertyOptional({ example: 'Partido amistoso entre amigos.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
