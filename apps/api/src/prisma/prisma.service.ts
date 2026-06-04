/**
 * PrismaService
 * ---------------------------------------------------------------------------
 * Extiende PrismaClient para integrarlo con el ciclo de vida de NestJS.
 * - OnModuleInit:    establece la conexión con la base de datos al iniciar.
 * - OnModuleDestroy: cierra la conexión limpiamente al apagar la aplicación.
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Capa de Persistencia (Repository / Data Mapper)
 * Diagrama relacionado: Diagrama de Componentes
 * Descripción académica: Se encapsula PrismaClient en un servicio Nest para
 *   aprovechar la inyección de dependencias y centralizar la gestión del
 *   pool de conexiones a PostgreSQL.
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Configuración de logs por nivel. En producción se podrían enviar al
      // LoggerService global (Winston) en lugar de stdout.
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Conexión a PostgreSQL cerrada.');
  }
}
