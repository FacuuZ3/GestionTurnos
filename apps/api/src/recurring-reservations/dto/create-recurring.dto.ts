/**
 * CreateRecurringReservationDto: payload para POST /recurring-reservations (ADMIN).
 *
 * Convención:
 *  - dayOfWeek:  0=domingo, 1=lunes, ..., 6=sábado.
 *  - startMinute / endMinute: minutos desde medianoche (0..1440).
 *    Ej.: 13:00 → 780; 14:30 → 870.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRecurringReservationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  courtId!: string;

  @ApiProperty({ minimum: 0, maximum: 6, example: 1, description: 'Día de la semana (0=domingo).' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ minimum: 0, maximum: 1439, example: 780, description: 'Minuto de inicio.' })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @ApiProperty({ minimum: 1, maximum: 1440, example: 870, description: 'Minuto de fin.' })
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;

  @ApiPropertyOptional({ example: 'Escuela de pádel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
