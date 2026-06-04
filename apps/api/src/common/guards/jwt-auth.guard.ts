/**
 * JwtAuthGuard
 * ---------------------------------------------------------------------------
 * Guard reutilizable que aplica la estrategia 'jwt' (access token).
 * Permite excluir endpoints marcados con @Public().
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Seguridad - Cadena de Guards
 * Diagrama relacionado: Diagrama de Secuencia - Autenticación
 */

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
