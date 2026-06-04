/**
 * AuditInterceptor
 * ---------------------------------------------------------------------------
 * Interceptor opcional que registra acciones de mutación (POST/PATCH/DELETE)
 * de usuarios ADMIN automáticamente. Se aplica vía @UseInterceptors() en
 * los controllers que se quieran auditar.
 *
 * El registro se hace en el `tap` posterior a la respuesta exitosa — si la
 * acción falla, no se loguea. La lógica vive aquí (no en cada service) para
 * cumplir Single Responsibility.
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    const method = req.method;

    // Sólo audit-eamos mutaciones de admins autenticados.
    const isMutation = method === 'POST' || method === 'PATCH' || method === 'DELETE';
    if (!isMutation || !user || user.role !== Role.ADMIN) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((response: unknown) => {
        const action = method.toUpperCase();
        const resource = extractResource(req.originalUrl ?? req.url ?? '');
        const resourceId =
          (req.params as Record<string, string>)?.id ??
          extractIdFromResponse(response) ??
          null;

        // Fire-and-forget: no esperamos al audit antes de devolver.
        void this.audit.record({
          actorId: user.id,
          actorEmail: user.email,
          action,
          resource,
          resourceId,
          ip: req.ip ?? null,
          metadata: {
            url: req.originalUrl ?? req.url ?? '',
            body: sanitizeBody(req.body),
          },
        });
      }),
    );
  }
}

/** "/api/courts/UUID" → "Court". Heurística simple basada en URL. */
function extractResource(url: string): string {
  const path = url.split('?')[0].replace(/^\/api\//, '');
  const segment = path.split('/')[0] ?? 'Unknown';
  const map: Record<string, string> = {
    courts: 'Court',
    reservations: 'Reservation',
    'recurring-reservations': 'RecurringReservation',
    'club-info': 'ClubInfo',
    users: 'User',
    auth: 'Auth',
  };
  return map[segment] ?? segment;
}

/** Si la response tiene `id`, lo extrae como resourceId. */
function extractIdFromResponse(response: unknown): string | null {
  if (response && typeof response === 'object' && 'id' in response) {
    const id = (response as { id: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

/** Borra campos sensibles del body antes de loguearlo. */
function sanitizeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const clone = { ...(body as Record<string, unknown>) };
  for (const k of ['password', 'newPassword', 'currentPassword', 'refreshToken', 'token']) {
    if (k in clone) clone[k] = '[REDACTED]';
  }
  return clone;
}
