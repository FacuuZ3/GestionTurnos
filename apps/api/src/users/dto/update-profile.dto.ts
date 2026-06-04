/**
 * UpdateProfileDto: payload de PATCH /users/me.
 * Sólo permite editar campos no sensibles del perfil. Email y rol no son
 * editables por el propio usuario.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan Pérez', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '+543482111111' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'Teléfono inválido (8-15 dígitos, opcional con +).' })
  phone?: string;
}
