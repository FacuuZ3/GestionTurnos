/**
 * ResetPasswordDto: payload de POST /auth/reset-password.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por email.' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  token!: string;

  @ApiProperty({ example: 'NuevaPass123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72)
  newPassword!: string;
}
