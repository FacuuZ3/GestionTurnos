/**
 * AuthModule
 * ---------------------------------------------------------------------------
 * Agrupa controllers, services y strategies de autenticación.
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Subsistema de Autenticación
 * Diagrama relacionado: Diagrama de Componentes
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    PassportModule,
    // JwtModule sin secret a nivel global: cada signAsync explicita el secret
    // (access vs refresh), lo que es más seguro y explícito que un default.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
