/**
 * AuthService
 * ---------------------------------------------------------------------------
 * Lógica de negocio del subsistema de autenticación.
 * Responsabilidades:
 *  - Registrar usuarios con contraseña hasheada (bcrypt).
 *  - Verificar credenciales en el login.
 *  - Emitir access + refresh tokens firmados con secretos distintos.
 *  - Generar y validar tokens de verificación de email.
 *  - Delegar el envío del email de verificación a NotificationsService.
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Subsistema de Autenticación
 * Diagrama relacionado: Diagrama de Secuencia - Registro / Login / Refresh
 * Descripción académica: La autenticación se basa en JWT con esquema dual
 *   (access token de corta duración y refresh token de larga duración),
 *   patrón recomendado por OWASP para SPAs y aplicaciones móviles.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

/** Vida útil de un token de reseteo de contraseña, en milisegundos. */
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // -------------------------------------------------------------------------
  // Registro
  // -------------------------------------------------------------------------

  async register(dto: RegisterDto): Promise<{ id: string; email: string; message: string }> {
    // 1) Email único.
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email.');
    }

    // 2) Hash de la contraseña.
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 3) Token de verificación de email (UUID v4 → suficientemente entrópico
    //    para uso de un solo paso, sin almacenar tokens largos).
    const emailVerifyToken = randomUUID();

    // 4) Persistencia.
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      phone: dto.phone,
      role: Role.USER,
      emailVerifyToken,
    });

    // 5) Envío del email de verificación. Errores SMTP se loguean en el canal
    //    pero no rompen el registro (en producción se podría reintentar con cola).
    await this.notifications.sendVerificationEmail(user.email, user.name, emailVerifyToken);

    return {
      id: user.id,
      email: user.email,
      message: 'Cuenta creada. Revisá tu email para verificar la cuenta.',
    };
  }

  // -------------------------------------------------------------------------
  // Verificación de email
  // -------------------------------------------------------------------------

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token || token.length < 8) {
      throw new BadRequestException('Token de verificación inválido.');
    }
    await this.users.verifyEmail(token);
    return { message: 'Cuenta verificada correctamente. Ya podés iniciar sesión.' };
  }

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  async login(dto: LoginDto): Promise<TokenPair & { user: SafeUser }> {
    const user = await this.users.findByEmail(dto.email);
    // Mensaje genérico para no revelar si el email existe o no (mitiga
    // enumeración de cuentas).
    if (!user) throw new UnauthorizedException('Credenciales inválidas.');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas.');

    // Borrado lógico: una cuenta desactivada por un admin no puede ingresar.
    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada. Contactá al complejo.');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('La cuenta aún no fue verificada por email.');
    }

    const tokens = await this.signTokens(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  // -------------------------------------------------------------------------
  // Reset de contraseña — solicitud
  // -------------------------------------------------------------------------

  /**
   * Genera un token de reseteo y lo envía por email.
   *
   * Seguridad: SIEMPRE devuelve el mismo mensaje independientemente de si el
   * email existe en la base. Esto evita que un atacante use este endpoint
   * para enumerar cuentas válidas del sistema.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const token = randomUUID() + randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    const user = await this.users.assignPasswordResetToken(email, token, expiresAt);
    if (user) {
      // Sólo enviamos el email si el usuario existe; el caller no se entera.
      await this.notifications.sendPasswordResetEmail(user.email, user.name, token);
    }

    return {
      message:
        'Si el email está registrado, te enviamos un enlace para restablecer tu contraseña.',
    };
  }

  /**
   * Aplica una contraseña nueva a partir de un token válido y no expirado.
   * El token se descarta tras usarlo (no se puede reutilizar).
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.resetPasswordWithToken(token, passwordHash);
    return { message: 'Contraseña actualizada. Ya podés iniciar sesión.' };
  }

  // -------------------------------------------------------------------------
  // Refresh
  // -------------------------------------------------------------------------

  async refresh(userId: string): Promise<TokenPair> {
    const user = await this.users.findByIdOrThrow(userId);
    // Corta las sesiones abiertas de una cuenta desactivada en la próxima
    // renovación del access token (vida corta), sin necesidad de revocar JWTs.
    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada.');
    }
    return this.signTokens(user);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async signTokens(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }

  private toSafeUser(user: User): SafeUser {
    const { password, emailVerifyToken, ...safe } = user;
    return safe;
  }
}

export type SafeUser = Omit<User, 'password' | 'emailVerifyToken'>;
