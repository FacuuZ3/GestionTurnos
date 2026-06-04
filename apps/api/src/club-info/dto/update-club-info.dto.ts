/**
 * UpdateClubInfoDto: payload de PATCH /club-info (ADMIN).
 * Todos los campos son opcionales — se aplica un merge.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateClubInfoDto {
  @ApiPropertyOptional({ example: 'Av. San Martín 1234, Reconquista, Santa Fe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description:
      'URL del iframe de Google Maps (atributo src). Pegar la URL del embed.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mapEmbedUrl?: string;

  @ApiPropertyOptional({ example: '13:00 a 23:00' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  weekdayHours?: string;

  @ApiPropertyOptional({ example: '13:00 a 23:00' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  weekendHours?: string;

  @ApiPropertyOptional({ example: '13:00 a 23:00' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  holidayHours?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Wi-Fi', 'Vestuario', 'Bar / Restaurante'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  services?: string[];
}
