/**
 * AuditService
 * ---------------------------------------------------------------------------
 * API para registrar y consultar acciones administrativas.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Trazabilidad y compliance
 */

import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecord {
  actorId: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  /**
   * Metadata arbitraria (URL, body sanitizado, etc.). Se acepta como objeto
   * plano; el service lo convierte al tipo InputJsonValue que espera Prisma.
   */
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una acción. Los errores se loguean pero NO se propagan: una
   * falla del audit log no debe romper la operación principal.
   */
  async record(rec: AuditRecord): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: rec.actorId,
          actorEmail: rec.actorEmail,
          action: rec.action,
          resource: rec.resource,
          resourceId: rec.resourceId ?? null,
          // Cast porque la metadata viene como objeto plano y Prisma
          // espera InputJsonValue (no acepta `unknown`). El cast es seguro
          // porque sanitizeBody ya filtró campos sensibles y JSON-safe.
          metadata: rec.metadata
            ? (rec.metadata as Prisma.InputJsonValue)
            : Prisma.DbNull,
          ip: rec.ip ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        'Audit log write failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** Lista paginada para el dashboard admin. */
  async list(params: {
    limit?: number;
    skip?: number;
    resource?: string;
    actorId?: string;
  }): Promise<{ items: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};
    if (params.resource) where.resource = params.resource;
    if (params.actorId) where.actorId = params.actorId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 50,
        skip: params.skip ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  }
}
