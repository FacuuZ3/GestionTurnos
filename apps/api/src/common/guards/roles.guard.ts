/**
 * RolesGuard
 * ---------------------------------------------------------------------------
 * Autorización basada en roles. Lee la metadata declarada con @Roles() y
 * verifica que el usuario autenticado posea al menos uno de los roles
 * permitidos.
 *
 * Requiere que JwtAuthGuard se ejecute previamente para que `req.user`
 * esté poblado.
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Endpoint sin restricción de rol: se aprueba.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const allowed = requiredRoles.includes(user.role);
    if (!allowed) {
      throw new ForbiddenException('No posee los permisos necesarios.');
    }
    return true;
  }
}
