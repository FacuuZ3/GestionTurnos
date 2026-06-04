/**
 * ClubInfoService
 * ---------------------------------------------------------------------------
 * Gestiona la información pública del club como SINGLETON (una sola fila
 * con id = 'default'). Si el registro no existe, se crea con valores
 * por defecto al primer GET.
 *
 * REFERENCIA INFORME - Capítulo 4: Diseño del Sistema
 * Sección: Patrón Singleton aplicado a configuración de aplicación
 */

import { Injectable } from '@nestjs/common';
import { ClubInfo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClubInfoDto } from './dto/update-club-info.dto';

const DEFAULTS = {
  id: 'default',
  address: 'Av. San Martín 1234, Reconquista, Santa Fe',
  mapEmbedUrl: null as string | null,
  weekdayHours: '13:00 a 23:00',
  weekendHours: '13:00 a 23:00',
  holidayHours: '13:00 a 23:00',
  services: ['Wi-Fi', 'Vestuario', 'Bar / Restaurante'],
};

@Injectable()
export class ClubInfoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve el registro singleton, creándolo si no existe. */
  async get(): Promise<ClubInfo> {
    const existing = await this.prisma.clubInfo.findFirst();
    if (existing) return existing;
    return this.prisma.clubInfo.create({ data: DEFAULTS });
  }

  /** Actualiza parcialmente el registro singleton (merge). */
  async update(dto: UpdateClubInfoDto): Promise<ClubInfo> {
    const existing = await this.get();
    return this.prisma.clubInfo.update({
      where: { id: existing.id },
      data: dto,
    });
  }
}
