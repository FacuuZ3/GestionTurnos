/**
 * LoginDto: payload del endpoint POST /auth/login.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'juan.perez@example.com', format: 'email' })
  @IsEmail({}, { message: 'Email inválido.' })
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria.' })
  password!: string;
}
