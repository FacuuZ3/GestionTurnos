/**
 * RefreshTokenDto: payload del endpoint POST /auth/refresh.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token JWT recibido previamente en /auth/login.',
    example: 'eyJhbGciOi...',
  })
  @IsJWT({ message: 'Refresh token con formato inválido.' })
  refreshToken!: string;
}
