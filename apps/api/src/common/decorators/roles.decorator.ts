/**
 * @Roles(...): declara los roles autorizados a invocar un endpoint.
 * Trabaja en conjunto con RolesGuard.
 *
 * Ejemplo:
 *   @Roles(Role.ADMIN)
 *   @Post('/courts')
 *   create(...) { ... }
 */

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
