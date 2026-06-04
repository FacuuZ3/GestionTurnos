/**
 * HealthController
 * ---------------------------------------------------------------------------
 * Endpoints estándar de observabilidad. Cada uno responde con un JSON
 * compatible con load balancers, Kubernetes probes y Uptime monitors.
 *
 *   - GET /health           → liveness check (¿el proceso está vivo?).
 *   - GET /health/readiness → readiness check (¿puede atender requests?).
 *
 * El readiness verifica DB + memoria; el liveness sólo confirma que el
 * proceso responde — diferencia clave para que Kubernetes reinicie por
 * crash pero no por DB caída momentáneamente.
 *
 * REFERENCIA INFORME - Capítulo 5: Implementación
 * Sección: Observabilidad y health checks
 * Diagrama relacionado: Diagrama de Despliegue (probes K8s/Docker)
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe — el proceso está vivo.',
    description:
      'Devuelve 200 OK si el proceso responde. Pensado para usarse en ' +
      'liveness probes de Kubernetes o monitores de uptime externos.',
  })
  liveness() {
    return this.health.check([]);
  }

  @Public()
  @Get('readiness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe — el sistema puede atender requests.',
    description:
      'Verifica DB y memoria heap. Devuelve 503 si alguna check falla. ' +
      'En K8s: usar como readinessProbe para que el load balancer deje ' +
      'de mandar tráfico si la base no responde.',
  })
  readiness() {
    return this.health.check([
      // 1) DB: ping con SELECT 1.
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      // 2) Memoria: heap actual no debe superar 300 MB.
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // 3) Memoria RSS no debe superar 500 MB.
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }
}
