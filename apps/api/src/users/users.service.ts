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
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
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

/**
 * Proyección de un usuario SIN campos sensibles (password, tokens). Se usa en
 * los listados de administración para no exponer hashes ni tokens al cliente.
 */
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** Vista pública (sin datos sensibles) de un usuario para el panel admin. */
export type AdminUserView = Prisma.UserGetPayload<{ select: typeof SAFE_USER_SELECT }>;

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

  // -------------------------------------------------------------------------
  // Gestión administrativa de usuarios (ADMIN)
  // -------------------------------------------------------------------------

  /**
   * Listado de usuarios para el panel admin. Filtros opcionales por rol y por
   * texto (nombre o email). Devuelve sólo campos no sensibles.
   */
  listAll(params: { role?: Role; search?: string }): Promise<AdminUserView[]> {
    const where: Prisma.UserWhereInput = {};
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cambia el rol de un usuario (promover/degradar admin).
   *
   * Guardrail: un admin no puede cambiar su propio rol, para evitar quedarse
   * sin acceso (auto-degradación accidental y consiguiente lock-out).
   */
  async setRole(id: string, role: Role, actingAdminId: string): Promise<AdminUserView> {
    if (id === actingAdminId) {
      throw new ForbiddenException('No podés cambiar tu propio rol.');
    }
    await this.findByIdOrThrow(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Elimina un usuario. Sólo se permite si:
   *  - No es la cuenta del propio admin que ejecuta la acción.
   *  - No tiene reservas asociadas (Reservation.user es onDelete: Restrict, de
   *    modo que un borrado físico fallaría; además se preserva el histórico).
   */
  async adminDelete(
    id: string,
    actingAdminId: string,
  ): Promise<{ id: string }> {
    if (id === actingAdminId) {
      throw new ForbiddenException('No podés eliminar tu propia cuenta.');
    }
    await this.findByIdOrThrow(id);

    const reservations = await this.prisma.reservation.count({ where: { userId: id } });
    if (reservations > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el usuario tiene ${reservations} reserva(s) asociada(s). ` +
          'Cancelá sus reservas antes de eliminarlo para preservar el histórico.',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { id };
  }
}
