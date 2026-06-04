/**
 * ForgotPasswordDto: payload de POST /auth/forgot-password.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'juan.perez@example.com', format: 'email' })
  @IsEmail({}, { message: 'Email inválido.' })
  @MaxLength(160)
  email!: string;
}
