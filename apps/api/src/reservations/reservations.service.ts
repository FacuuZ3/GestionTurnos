/**
 * ReservationsService
 * ===========================================================================
 *  Subsistema crítico del proyecto. Implementa:
 *
 *    1. Cálculo de disponibilidad por cancha y fecha (slots de 90 min).
 *    2. Creación de reservas con CONTROL DE CONCURRENCIA estricto mediante
 *       transacción de nivel SERIALIZABLE + bloqueo explícito FOR UPDATE
 *       sobre las reservas potencialmente solapadas + reintento ante
 *       errores de serialización.
 *    3. Cancelación, reprogramación y consultas administrativas.
 *
 *  REFERENCIA INFORME - Capítulo 5: Implementación
 *  Sección: 5.x - Concurrencia y consistencia transaccional
 *  Diagrama relacionado: Diagrama de Secuencia "Reserva con bloqueo
 *    serializable" y Diagrama de Actividades "Verificación de solapamiento".
 *
 *  Descripción académica: El sistema garantiza la propiedad de unicidad de
 *  turno por cancha y rango horario sin requerir extensiones nativas de
 *  PostgreSQL (btree_gist, EXCLUDE USING gist). La estrategia combina:
 *
 *    a) Nivel de aislamiento SERIALIZABLE (Serializable Snapshot Isolation,
 *       SSI) provisto por PostgreSQL, que detecta y aborta las anomalías
 *       de "phantom read" entre transacciones concurrentes.
 *    b) Una consulta `SELECT ... FOR UPDATE` que bloquea cualquier reserva
 *       existente que pudiera solaparse con la nueva, evitando que se
 *       modifique en paralelo.
 *    c) Un mecanismo de reintento limitado para gestionar los abortos
 *       inevitables de SSI (códigos 40001 / Prisma P2034) de forma
 *       transparente para el cliente final.
 *
 *  Las consecuencias prácticas son que, ante dos solicitudes concurrentes
 *  para el mismo slot, una se persiste y la otra recibe 409 CONFLICT con un
 *  mensaje legible, en lugar de generar reservas duplicadas.
 * ===========================================================================
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  Reservation,
  ReservationStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { RescheduleReservationDto } from './dto/reschedule.dto';
import { ReservationEventPayload } from '../notifications/listeners/reservation.listener';
import { BOOKING_POLICY, daysFromNow, hoursFromNow } from './booking-policy';

/** Duración estándar de un turno (en minutos). */
const SLOT_DURATION_MIN = 90;

/** Ventana operativa del complejo (hora local del servidor). */
const OPENING_HOUR = 13;  // 13:00 - primer turno disponible
const CLOSING_HOUR = 23;  // 23:00 - el último slot debe terminar antes o igual a esta hora

/** Tope de reintentos ante errores de serialización (SSI). */
const MAX_SERIALIZATION_RETRIES = 3;

/**
 * Convierte un string "YYYY-MM-DD" (o ISO completo) a un Date que representa
 * la MEDIANOCHE LOCAL del servidor para ese día calendario.
 *
 * Necesario porque `new Date("YYYY-MM-DD")` lo interpreta como UTC, lo que en
 * husos negativos (Argentina = UTC-3) provoca que la fecha calendario local
 * caiga en el día anterior. Este helper parsea los componentes y usa el
 * constructor en hora local, evitando el desfasaje.
 */
function parseDateLocal(isoOrYMD: string): Date {
  const datePart = isoOrYMD.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  isReserved: boolean;
  reservationId: string | null;
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // =========================================================================
  //  Consultas
  // =========================================================================

  /**
   * Devuelve los slots disponibles y ocupados de una cancha en un día.
   * Lógica: genera slots de 90 min entre OPENING_HOUR y CLOSING_HOUR y los
   * marca como ocupados si existe una reserva CONFIRMED o PENDING que se
   * solape con ellos.
   */
  async getAvailability(courtId: string, isoDate: string): Promise<AvailabilitySlot[]> {
    // Validamos que la cancha exista y esté activa.
    const court = await this.prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Cancha no encontrada.');
    if (!court.isActive) throw new BadRequestException('La cancha no está habilitada.');

    // Normalizamos la fecha al rango [00:00, 24:00) del día consultado.
    // IMPORTANTE: parseDateLocal evita el corrimiento de huso horario que
    // se produce al usar new Date("YYYY-MM-DD") en zonas horarias negativas.
    const dayStart = parseDateLocal(isoDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Traemos las reservas activas (no canceladas) del día.
    const reservations = await this.prisma.reservation.findMany({
      where: {
        courtId,
        status: { not: ReservationStatus.CANCELLED },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { id: true, startTime: true, endTime: true },
    });

    // Traemos también los turnos fijos del día de la semana correspondiente.
    const dayOfWeek = dayStart.getDay();
    const recurring = await this.prisma.recurringReservation.findMany({
      where: { courtId, dayOfWeek, isActive: true },
      select: { id: true, startMinute: true, endMinute: true },
    });

    // Generamos los slots y marcamos ocupación.
    // Condición: el slot solo se incluye si su FIN no excede CLOSING_HOUR.
    // De ese modo el último turno termina <= 23:00 sin sobrepasar el horario.
    const slots: AvailabilitySlot[] = [];
    const slotDurationHours = SLOT_DURATION_MIN / 60; // 1.5
    for (let hour = OPENING_HOUR; hour + slotDurationHours <= CLOSING_HOUR; hour += slotDurationHours) {
      const slotStart = new Date(dayStart);
      slotStart.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MIN * 60 * 1000);

      // ¿Choca con una reserva puntual?
      const overlap = reservations.find(
        (r) => r.startTime < slotEnd && r.endTime > slotStart,
      );

      // ¿Choca con un turno fijo? Comparamos en minutos-desde-medianoche.
      const slotStartMin = slotStart.getHours() * 60 + slotStart.getMinutes();
      const slotEndMin = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      const recurringHit = recurring.find(
        (r) => r.startMinute < slotEndMin && r.endMinute > slotStartMin,
      );

      slots.push({
        start: slotStart,
        end: slotEnd,
        isReserved: Boolean(overlap) || Boolean(recurringHit),
        reservationId: overlap?.id ?? null,
      });
    }
    return slots;
  }

  /** Listado de reservas del usuario autenticado (más recientes primero). */
  listMine(userId: string): Promise<Reservation[]> {
    return this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      include: { court: true },
    });
  }

  /**
   * Listado administrativo con filtros opcionales por fecha y cancha.
   * Usado por el dashboard de ADMIN.
   */
  listAdmin(filters: { date?: string; courtId?: string }): Promise<Reservation[]> {
    const where: Prisma.ReservationWhereInput = {};
    if (filters.courtId) where.courtId = filters.courtId;
    if (filters.date) {
      // Misma normalización local-time que en getAvailability para evitar
      // que el filtro caiga en el día anterior por el huso horario.
      const dayStart = parseDateLocal(filters.date);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.startTime = { gte: dayStart, lt: dayEnd };
    }
    return this.prisma.reservation.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { court: true, user: true },
    });
  }

  // =========================================================================
  //  Creación transaccional (ENDPOINT CRÍTICO)
  // =========================================================================

  /**
   * Crea una reserva garantizando que no se solape con ninguna existente.
   *
   * El procedimiento se encapsula en `runCreateAttempt` y se invoca a través
   * de `withSerializableRetry` para manejar abortos por SSI de forma
   * transparente.
   */
  async create(user: AuthUser, dto: CreateReservationDto): Promise<Reservation> {
    const created = await this.withSerializableRetry(() =>
      this.runCreateAttempt(user, dto),
    );

    // Disparo del evento de dominio FUERA de la transacción: solo si la
    // persistencia fue exitosa publicamos el evento (consistencia
    // "outbox-like" simplificada — adecuado para el alcance académico).
    await this.emitReservationConfirmed(created.id);

    return created;
  }

  /**
   * Bloque transaccional de creación de una reserva.
   * Comentado paso a paso para uso directo en el Capítulo 5 del informe.
   */
  private runCreateAttempt(
    user: AuthUser,
    dto: CreateReservationDto,
  ): Promise<Reservation> {
    return this.prisma.$transaction(
      async (tx) => {
        // -------------------------------------------------------------------
        // (a) Validación de invariantes de dominio antes de tocar la base.
        //     Lanzar excepciones aquí aborta la transacción sin escribir.
        // -------------------------------------------------------------------
        if (!(dto.startTime instanceof Date) || !(dto.endTime instanceof Date)) {
          throw new BadRequestException('Fechas inválidas.');
        }
        if (dto.startTime.getTime() >= dto.endTime.getTime()) {
          throw new BadRequestException('startTime debe ser anterior a endTime.');
        }
        if (dto.startTime.getTime() < Date.now()) {
          throw new BadRequestException('No se pueden reservar turnos en el pasado.');
        }

        // -------------------------------------------------------------------
        // (a.2) REGLAS DE NEGOCIO (BookingPolicy). ADMIN está exento.
        //       Ver apps/api/src/reservations/booking-policy.ts
        // -------------------------------------------------------------------
        const isAdmin = user.role === Role.ADMIN;
        if (!isAdmin) {
          const hours = hoursFromNow(dto.startTime);
          const days = daysFromNow(dto.startTime);

          if (hours < BOOKING_POLICY.MIN_HOURS_BEFORE_START_TO_BOOK) {
            throw new BadRequestException(
              `Las reservas deben hacerse con al menos ${BOOKING_POLICY.MIN_HOURS_BEFORE_START_TO_BOOK}h de anticipación.`,
            );
          }
          if (days > BOOKING_POLICY.MAX_DAYS_AHEAD) {
            throw new BadRequestException(
              `Solo se puede reservar con hasta ${BOOKING_POLICY.MAX_DAYS_AHEAD} días de anticipación.`,
            );
          }

          // Conteo de reservas activas futuras del usuario. Se ejecuta DENTRO
          // de la transacción para evitar TOCTOU si el cliente lanza varias
          // creaciones simultáneas.
          const activeCount = await tx.reservation.count({
            where: {
              userId: user.id,
              status: { not: ReservationStatus.CANCELLED },
              startTime: { gte: new Date() },
            },
          });
          if (activeCount >= BOOKING_POLICY.MAX_ACTIVE_RESERVATIONS_PER_USER) {
            throw new BadRequestException(
              `Alcanzaste el límite de ${BOOKING_POLICY.MAX_ACTIVE_RESERVATIONS_PER_USER} reservas activas. ` +
                `Cancelá alguna existente para reservar otra.`,
            );
          }
        }

        // -------------------------------------------------------------------
        // (b) Verificación de la cancha:
        //     - Debe existir.
        //     - Debe estar activa (isActive = true).
        //     Se consulta dentro de la transacción para evitar TOCTOU
        //     (time-of-check to time-of-use) frente a soft-deletes.
        // -------------------------------------------------------------------
        const court = await tx.court.findUnique({ where: { id: dto.courtId } });
        if (!court) throw new NotFoundException('Cancha no encontrada.');
        if (!court.isActive) {
          throw new BadRequestException('La cancha no está habilitada para reservas.');
        }

        // -------------------------------------------------------------------
        // (c) Verificación de SOLAPAMIENTO con bloqueo explícito (SELECT
        //     ... FOR UPDATE). Dos reservas [a,b) y [c,d) se solapan ⇔
        //     a < d && c < b. Usamos $queryRaw para ejercer un row-level
        //     lock sobre cualquier reserva conflictiva existente.
        //
        //     Importante:
        //       * El nivel SERIALIZABLE (configurado abajo) ya previene
        //         "phantom reads" entre transacciones concurrentes. SSI de
        //         PostgreSQL detectará una anomalía y abortará una de las
        //         transacciones con código 40001 si dos sesiones intentan
        //         insertar reservas que se solapan a la vez.
        //       * El FOR UPDATE adicional bloquea filas existentes (p. ej.,
        //         si una reserva está en CONFIRMED y otra sesión intenta
        //         pasarla a CANCELLED concurrentemente, esa segunda sesión
        //         quedará esperando hasta que termine esta transacción).
        // -------------------------------------------------------------------
        const overlapping = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM "reservations"
          WHERE "courtId" = ${dto.courtId}::uuid
            AND status <> 'CANCELLED'
            AND "startTime" < ${dto.endTime}
            AND "endTime"   > ${dto.startTime}
          FOR UPDATE
        `);

        if (overlapping.length > 0) {
          // 409 Conflict: respuesta semánticamente correcta para "el recurso
          // que querés crear entra en conflicto con el estado actual".
          throw new ConflictException(
            'El horario solicitado ya está reservado para esta cancha.',
          );
        }

        // -------------------------------------------------------------------
        // (c.2) Verificación contra TURNOS FIJOS (bloqueos recurrentes).
        //     Se calcula el día de la semana del slot y se comparan los
        //     minutos-desde-medianoche del rango solicitado con los rangos
        //     fijos activos para esa cancha y ese día.
        // -------------------------------------------------------------------
        const dayOfWeek = dto.startTime.getDay();
        const startMin = dto.startTime.getHours() * 60 + dto.startTime.getMinutes();
        const endMin = dto.endTime.getHours() * 60 + dto.endTime.getMinutes();

        const recurringConflict = await tx.recurringReservation.findFirst({
          where: {
            courtId: dto.courtId,
            dayOfWeek,
            isActive: true,
            startMinute: { lt: endMin },
            endMinute: { gt: startMin },
          },
        });
        if (recurringConflict) {
          throw new ConflictException(
            'Ese horario está bloqueado por un turno fijo en esta cancha.',
          );
        }

        // -------------------------------------------------------------------
        // (d) Inserción de la reserva. Si llegamos hasta aquí dentro de una
        //     transacción SERIALIZABLE significa que la verificación de
        //     solapamiento fue consistente; PostgreSQL abortará la transacción
        //     con 40001 si entre (c) y (d) otra sesión rompió la premisa.
        // -------------------------------------------------------------------
        const reservation = await tx.reservation.create({
          data: {
            userId: user.id,
            courtId: dto.courtId,
            startTime: dto.startTime,
            endTime: dto.endTime,
            status: ReservationStatus.CONFIRMED,
            notes: dto.notes,
          },
        });

        // -------------------------------------------------------------------
        // (e) Retornamos la entidad creada. El COMMIT lo realiza Prisma al
        //     finalizar la función sin errores.
        // -------------------------------------------------------------------
        return reservation;
      },
      {
        // Aislamiento estricto: PostgreSQL Serializable (SSI).
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        // Tiempo máximo de espera por la apertura de la tx.
        maxWait: 5_000,
        // Tiempo máximo total que puede durar la tx (evita locks colgados).
        timeout: 10_000,
      },
    );
  }

  /**
   * Ejecuta `fn` reintentando hasta MAX_SERIALIZATION_RETRIES veces si
   * Postgres devuelve un error de serialización (código 40001 / Prisma P2034).
   *
   * Solo se reintentan los errores de SSI: cualquier otra excepción
   * (Conflict, BadRequest, etc.) se propaga inmediatamente.
   */
  private async withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (err) {
        if (this.isSerializationError(err) && attempt < MAX_SERIALIZATION_RETRIES) {
          attempt += 1;
          // Pequeño backoff exponencial: 20ms, 40ms, 80ms.
          await new Promise((r) => setTimeout(r, 20 * 2 ** (attempt - 1)));
          this.logger.warn(
            `Conflicto SSI al crear reserva (intento ${attempt}/${MAX_SERIALIZATION_RETRIES}); reintentando.`,
          );
          continue;
        }
        throw err;
      }
    }
  }

  /** Heurística: ¿Es un error de serialización (SSI) reintenable? */
  private isSerializationError(err: unknown): boolean {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2034: "Transaction failed due to a write conflict or a deadlock".
      if (err.code === 'P2034') return true;
    }
    // Algunos drivers exponen el código SQLSTATE en .meta.code o en el message.
    const message = (err as Error)?.message ?? '';
    return /40001|serialization_failure/i.test(message);
  }

  // =========================================================================
  //  Cambios de estado y reprogramación
  // =========================================================================

  /**
   * Cancela una reserva. El propio dueño o un ADMIN pueden hacerlo.
   * El usuario común está sujeto a la política de cancelación (BookingPolicy):
   * no puede cancelar dentro de las N horas previas al inicio del turno.
   */
  async cancel(user: AuthUser, id: string): Promise<Reservation> {
    const reservation = await this.findByIdOrThrow(id);

    if (user.role !== Role.ADMIN && reservation.userId !== user.id) {
      throw new ForbiddenException('No podés cancelar una reserva ajena.');
    }
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('La reserva ya estaba cancelada.');
    }

    // Política de cancelación (ADMIN exento).
    if (user.role !== Role.ADMIN) {
      const hours = hoursFromNow(reservation.startTime);
      if (hours < BOOKING_POLICY.MIN_HOURS_BEFORE_START_TO_CANCEL) {
        throw new BadRequestException(
          `No se puede cancelar dentro de las ${BOOKING_POLICY.MIN_HOURS_BEFORE_START_TO_CANCEL}h previas al turno. ` +
            `Contactá al complejo si necesitás liberar el horario.`,
        );
      }
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });

    await this.emitReservationCancelled(updated.id);
    return updated;
  }

  /** Cambia el estado (ADMIN). */
  async changeStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    await this.findByIdOrThrow(id);
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status },
    });

    if (status === ReservationStatus.CANCELLED) {
      await this.emitReservationCancelled(updated.id);
    }
    return updated;
  }

  /**
   * Reprograma un turno (ADMIN) reutilizando la lógica de verificación de
   * solapamiento mediante una transacción serializable.
   */
  reschedule(id: string, dto: RescheduleReservationDto): Promise<Reservation> {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const current = await tx.reservation.findUnique({ where: { id } });
          if (!current) throw new NotFoundException('Reserva no encontrada.');
          if (current.status === ReservationStatus.CANCELLED) {
            throw new BadRequestException('No se puede reprogramar una reserva cancelada.');
          }
          if (dto.startTime.getTime() >= dto.endTime.getTime()) {
            throw new BadRequestException('startTime debe ser anterior a endTime.');
          }

          // Mismo bloqueo de solapamiento, excluyendo la propia reserva.
          const conflicts = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id FROM "reservations"
            WHERE "courtId" = ${current.courtId}::uuid
              AND id <> ${id}::uuid
              AND status <> 'CANCELLED'
              AND "startTime" < ${dto.endTime}
              AND "endTime"   > ${dto.startTime}
            FOR UPDATE
          `);
          if (conflicts.length > 0) {
            throw new ConflictException('El nuevo horario se solapa con otra reserva.');
          }

          return tx.reservation.update({
            where: { id },
            data: {
              startTime: dto.startTime,
              endTime: dto.endTime,
              // Marca temporal de la reprogramación para poder agruparlas
              // como categoría distinta en el dashboard.
              rescheduledAt: new Date(),
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 10_000,
        },
      ),
    );
  }

  // =========================================================================
  //  Helpers internos
  // =========================================================================

  async findByIdOrThrow(id: string): Promise<Reservation> {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reserva no encontrada.');
    return r;
  }

  private async buildEventPayload(reservationId: string): Promise<ReservationEventPayload | null> {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true, court: true },
    });
    if (!r) return null;
    return {
      userEmail: r.user.email,
      userName: r.user.name,
      courtName: r.court.name,
      startTime: r.startTime,
    };
  }

  private async emitReservationConfirmed(reservationId: string): Promise<void> {
    const payload = await this.buildEventPayload(reservationId);
    if (payload) this.events.emit('reservation.confirmed', payload);
  }

  private async emitReservationCancelled(reservationId: string): Promise<void> {
    const payload = await this.buildEventPayload(reservationId);
    if (payload) this.events.emit('reservation.cancelled', payload);
  }
}
