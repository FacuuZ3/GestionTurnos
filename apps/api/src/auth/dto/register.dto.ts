/**
 * RegisterDto: payload para POST /auth/register.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez', minLength: 2, maxLength: 120 })
  @IsString({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre es demasiado corto.' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'juan.perez@example.com', format: 'email' })
  @IsEmail({}, { message: 'Email inválido.' })
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({ example: '+543482111111' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'Teléfono inválido (8-15 dígitos, opcional con +).' })
  phone?: string;
}
