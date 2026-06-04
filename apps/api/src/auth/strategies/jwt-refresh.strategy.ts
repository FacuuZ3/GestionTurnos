/**
 * JwtRefreshStrategy
 * ---------------------------------------------------------------------------
 * Estrategia Passport para validar refresh tokens. Usa un secreto distinto
 * del access token y se aplica únicamente en el endpoint POST /auth/refresh.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

function extractFromBody(req: Request): string | null {
  const body = req?.body as { refreshToken?: string } | undefined;
  return body?.refreshToken ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractFromBody,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: RefreshTokenPayload): AuthUser {
    if (!payload?.sub) throw new UnauthorizedException('Refresh token inválido.');
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
