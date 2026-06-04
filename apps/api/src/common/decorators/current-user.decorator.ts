/**
 * @CurrentUser(): inyecta el usuario autenticado en el parámetro del controlador.
 * El payload es agregado a la request por la JwtStrategy.
 *
 * Ejemplo:
 *   @Get('me')
 *   me(@CurrentUser() user: AuthUser) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Estructura del usuario autenticado que se adjunta a la request.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
