/**
 * CourtsService
 * ---------------------------------------------------------------------------
 * Capa de servicio para la entidad Court (Repository sobre Prisma).
 *
 * Operaciones:
 *  - list(includeInactive)  : listado público (activas) o admin (todas).
 *  - findByIdOrThrow(id)    : búsqueda obligatoria.
 *  - create(dto)            : alta.
 *  - update(id, dto)        : edición parcial.
 *  - softDelete(id)         : desactivación lógica (isActive = false).
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Capa de Dominio - Gestión de Canchas
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Court, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeInactive = false): Promise<Court[]> {
    return this.prisma.court.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByIdOrThrow(id: string): Promise<Court> {
    const court = await this.prisma.court.findUnique({ where: { id } });
    if (!court) throw new NotFoundException('Cancha no encontrada.');
    return court;
  }

  create(dto: CreateCourtDto): Promise<Court> {
    return this.prisma.court.create({
      data: {
        name: dto.name,
        sportType: dto.sportType,
        description: dto.description,
        isActive: dto.isActive ?? true,
        pricePerHour: new Prisma.Decimal(dto.pricePerHour),
      },
    });
  }

  async update(id: string, dto: UpdateCourtDto): Promise<Court> {
    await this.findByIdOrThrow(id);
    return this.prisma.court.update({
      where: { id },
      data: {
        name: dto.name,
        sportType: dto.sportType,
        description: dto.description,
        isActive: dto.isActive,
        pricePerHour:
          dto.pricePerHour !== undefined ? new Prisma.Decimal(dto.pricePerHour) : undefined,
      },
    });
  }

  /**
   * Soft delete: mantiene el registro para preservar el histórico de reservas.
   */
  async softDelete(id: string): Promise<Court> {
    await this.findByIdOrThrow(id);
    return this.prisma.court.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Hard delete: borra la cancha y TODO lo asociado a ella (reservas
   * históricas + turnos fijos) en una transacción atómica.
   *
   * Restricción:
   *  - Sólo se permite si la cancha YA está suspendida (isActive=false).
   *    Esto fuerza un flujo en dos pasos que evita borrados accidentales.
   *
   * El borrado destruye historial — los reportes de facturación posteriores
   * dejarán de incluir esta cancha. Para mantener el histórico, la opción
   * recomendada es seguir usando "Suspender" (soft delete).
   *
   * REFERENCIA INFORME - Capítulo 5: Implementación
   * Sección: Borrado físico controlado vs soft delete
   */
  async hardDelete(
    id: string,
  ): Promise<{ id: string; deletedReservations: number }> {
    const court = await this.findByIdOrThrow(id);

    if (court.isActive) {
      throw new BadRequestException(
        'Primero suspendé la cancha y después podrás eliminarla definitivamente.',
      );
    }

    // Transacción: si falla un paso, no quedan registros huérfanos.
    const deletedReservations = await this.prisma.$transaction(async (tx) => {
      // 1) Borramos todas las reservas históricas de esa cancha. El FK
      //    Reservation.court tiene onDelete: Restrict, por eso debemos
      //    hacerlo manualmente ANTES de eliminar la cancha.
      const res = await tx.reservation.deleteMany({ where: { courtId: id } });
      // 2) Los turnos fijos se eliminan automáticamente por cascade.
      await tx.court.delete({ where: { id } });
      return res.count;
    });

    return { id, deletedReservations };
  }
}
