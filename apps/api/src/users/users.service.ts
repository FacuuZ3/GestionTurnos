/**
 * UsersService
 * ---------------------------------------------------------------------------
 * Encapsula el acceso a la entidad User. Cumple el rol de Repository
 * (capa de persistencia del dominio Usuario).
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Capa de Dominio - Gestión de Usuarios
 * Diagrama relacionado: Diagrama de Clases
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role?: Role;
  emailVerifyToken: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea un nuevo usuario con contraseña ya hasheada. */
  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.passwordHash,
        phone: data.phone,
        role: data.role ?? Role.USER,
        emailVerifyToken: data.emailVerifyToken,
        isEmailVerified: false,
      },
    });
  }

  /** Busca por email (para login). Devuelve null si no existe. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /** Busca por id; lanza NotFoundException si no existe. */
  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  /** Marca la cuenta como verificada a partir del token enviado por email. */
  async verifyEmail(token: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { emailVerifyToken: token } });
    if (!user) throw new NotFoundException('Token de verificación inválido o expirado.');

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });
  }

  /**
   * Asocia un token de reseteo de contraseña al usuario con su vencimiento.
   * Si el usuario no existe, devuelve null SIN lanzar excepción para evitar
   * que el endpoint /auth/forgot-password permita enumerar cuentas.
   */
  async assignPasswordResetToken(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });
  }

  /**
   * Actualiza el perfil editable del usuario (nombre, teléfono).
   * No permite cambiar email ni rol desde este método.
   */
  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string },
  ): Promise<User> {
    await this.findByIdOrThrow(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    });
  }

  /**
   * Cambia la contraseña de un usuario autenticado.
   * Requiere y valida la contraseña actual antes de aplicar la nueva.
   * Defensa contra escenarios donde el access token fue robado pero el
   * atacante no conoce la contraseña.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.findByIdOrThrow(userId);

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      throw new BadRequestException('La nueva contraseña debe ser distinta de la actual.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    return { message: 'Contraseña actualizada con éxito.' };
  }

  /**
   * Aplica un nuevo password hash al usuario identificado por el token de
   * reseteo, y borra el token para que no se pueda reutilizar.
   */
  async resetPasswordWithToken(
    token: string,
    passwordHash: string,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
    });
    if (!user) throw new NotFoundException('Token de reseteo inválido.');

    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException('Token de reseteo expirado. Solicitá uno nuevo.');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });
  }
}
