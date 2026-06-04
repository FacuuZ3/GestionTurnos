/**
 * AppModule
 * ---------------------------------------------------------------------------
 * Módulo raíz que compone:
 *  - ConfigModule global con validación Joi.
 *  - ThrottlerModule (rate limiting global por IP).
 *  - EventEmitterModule (bus de eventos del dominio).
 *  - PrismaModule (acceso a base de datos).
 *  - Módulos de dominio: Users, Auth, Courts, Reservations, Notifications.
 *  - JwtAuthGuard como guard global (las rutas públicas se marcan con @Public()).
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Composición de módulos y capas transversales
 * Diagrama relacionado: Diagrama de Componentes
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CourtsModule } from './courts/courts.module';
import { ReservationsModule } from './reservations/reservations.module';
import { RecurringReservationsModule } from './recurring-reservations/recurring-reservations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ClubInfoModule } from './club-info/club-info.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    NotificationsModule,
    UsersModule,
    AuthModule,
    CourtsModule,
    ReservationsModule,
    RecurringReservationsModule,
    ClubInfoModule,
    HealthModule,
    AuditModule,
  ],
  providers: [
    // JwtAuthGuard como guard global: por defecto todo endpoint requiere
    // autenticación; las rutas que deban ser públicas se marcan con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Rate limit global ante abuso por IP. Endpoints sensibles
    // (reservations.create) podrán endurecerlo con @Throttle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // AuditInterceptor global: registra acciones de mutación de admins.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
