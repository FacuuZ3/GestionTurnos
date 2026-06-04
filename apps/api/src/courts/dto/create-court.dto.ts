/**
 * CreateCourtDto: payload para POST /courts (ADMIN).
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SportType } from '@prisma/client';

export class CreateCourtDto {
  @ApiProperty({ example: 'Cancha Norte', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ enum: SportType, example: SportType.PADEL })
  @IsEnum(SportType, { message: 'Tipo de deporte inválido.' })
  sportType!: SportType;

  @ApiPropertyOptional({ example: 'Cancha techada con paredes de blindex.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 6000, description: 'Precio por hora en pesos argentinos.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerHour!: number;
}
