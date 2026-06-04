/**
 * RecurringReservationsService
 * ---------------------------------------------------------------------------
 * Capa de servicio para los turnos fijos (bloqueos recurrentes semanales).
 *
 * Operaciones:
 *  - list(courtId?)       : listar (filtrado opcional por cancha).
 *  - create(dto)          : alta, rechazando si choca con otro turno fijo.
 *  - softDelete(id)       : liberar el bloqueo (isActive=false).
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Capa de Dominio - Bloqueos recurrentes
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecurringReservation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringReservationDto } from './dto/create-recurring.dto';

@Injectable()
export class RecurringReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista los turnos fijos activos. Si se pasa courtId, filtra por cancha. */
  list(courtId?: string): Promise<RecurringReservation[]> {
    return this.prisma.recurringReservation.findMany({
      where: { isActive: true, ...(courtId ? { courtId } : {}) },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
      include: { court: true },
    });
  }

  /**
   * Crea un nuevo turno fijo. Verifica:
   *  - El horario sea coherente (start < end).
   *  - La cancha exista y esté activa.
   *  - No haya otro turno fijo activo solapado en el mismo día de semana.
   */
  async create(dto: CreateRecurringReservationDto): Promise<RecurringReservation> {
    if (dto.startMinute >= dto.endMinute) {
      throw new BadRequestException('startMinute debe ser menor que endMinute.');
    }

    const court = await this.prisma.court.findUnique({ where: { id: dto.courtId } });
    if (!court) throw new NotFoundException('Cancha no encontrada.');
    if (!court.isActive) throw new BadRequestException('La cancha no está habilitada.');

    // Verificación de solapamiento: dos rangos [a,b) y [c,d) se solapan ⇔ a<d ∧ c<b.
    const conflict = await this.prisma.recurringReservation.findFirst({
      where: {
        courtId: dto.courtId,
        dayOfWeek: dto.dayOfWeek,
        isActive: true,
        startMinute: { lt: dto.endMinute },
        endMinute: { gt: dto.startMinute },
      },
    });
    if (conflict) {
      throw new ConflictException('Ya existe un turno fijo en ese rango.');
    }

    return this.prisma.recurringReservation.create({
      data: {
        courtId: dto.courtId,
        dayOfWeek: dto.dayOfWeek,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        notes: dto.notes,
      },
    });
  }

  /** Suspende un turno fijo (soft delete). */
  async softDelete(id: string): Promise<RecurringReservation> {
    const found = await this.prisma.recurringReservation.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Turno fijo no encontrado.');
    return this.prisma.recurringReservation.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
