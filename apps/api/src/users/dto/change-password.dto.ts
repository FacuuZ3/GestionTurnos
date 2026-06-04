/**
 * ChangePasswordDto: payload de POST /users/me/change-password.
 * Requiere la contraseña actual: garantiza que el cambio fue iniciado por
 * el verdadero dueño de la sesión (defensa frente a token robado).
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual del usuario.' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ example: 'NuevaPass123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72)
  newPassword!: string;
}
