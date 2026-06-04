/**
 * Tests unitarios de ReservationsService.
 * ---------------------------------------------------------------------------
 * Cubre los flujos críticos del Paso 4 del informe:
 *   - Validaciones de dominio (rango horario, cancha activa).
 *   - Detección de solapamiento dentro de la transacción.
 *   - Reintento ante errores de serialización (SSI).
 *   - Emisión del evento 'reservation.confirmed' DESPUÉS del commit.
 *
 * Estrategia: se mockea PrismaService y EventEmitter2. La transacción
 * Serializable se simula ejecutando el callback con un cliente mock,
 * pero la lógica de validación, locking y retry se ejerce íntegramente.
 *
 * REFERENCIA INFORME - Capítulo 6: Verificación y Validación
 * Sección: Tests unitarios del subsistema de reservas
 */

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Role, ReservationStatus } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tomorrowAt = (hour: number, minute = 0): Date => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const user: AuthUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'test@test.local',
  role: Role.USER,
};

const activeCourt = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Cancha Test',
  isActive: true,
};

interface PrismaMock {
  reservation: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  court: {
    findUnique: jest.Mock;
  };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
}

const buildPrismaMock = (): PrismaMock => {
  const tx = {
    reservation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    court: {
      findUnique: jest.fn().mockResolvedValue(activeCourt),
    },
    $queryRaw: jest.fn().mockResolvedValue([]), // por defecto, no hay solapamiento
  };

  const prisma: PrismaMock = {
    reservation: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'res-1',
        user: { email: 'test@test.local', name: 'Tester' },
        court: { name: activeCourt.name },
        startTime: tomorrowAt(10),
      }),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    court: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
    // Simula prisma.$transaction: ejecuta el callback con el tx mock.
    $transaction: jest.fn((cb: (txArg: typeof tx) => Promise<unknown>) => cb(tx)),
  };

  // Inyectamos el tx interno para que los tests puedan inspeccionarlo.
  (prisma as PrismaMock & { __tx?: typeof tx }).__tx = tx;
  return prisma;
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ReservationsService.create', () => {
  let service: ReservationsService;
  let prisma: PrismaMock & { __tx?: any };
  let events: EventEmitter2;

  beforeEach(() => {
    prisma = buildPrismaMock();
    events = new EventEmitter2();
    jest.spyOn(events, 'emit');
    service = new ReservationsService(prisma as unknown as never, events);
  });

  it('rechaza una reserva si startTime es posterior o igual a endTime', async () => {
    const start = tomorrowAt(10);
    await expect(
      service.create(user, {
        courtId: activeCourt.id,
        startTime: start,
        endTime: start, // mismo instante → inválido
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una reserva con fecha en el pasado', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60);
    await expect(
      service.create(user, {
        courtId: activeCourt.id,
        startTime: past,
        endTime: new Date(past.getTime() + 90 * 60 * 1000),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza NotFound si la cancha no existe', async () => {
    prisma.__tx.court.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.create(user, {
        courtId: activeCourt.id,
        startTime: tomorrowAt(10),
        endTime: tomorrowAt(11, 30),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza BadRequest si la cancha está suspendida', async () => {
    prisma.__tx.court.findUnique.mockResolvedValueOnce({ ...activeCourt, isActive: false });
    await expect(
      service.create(user, {
        courtId: activeCourt.id,
        startTime: tomorrowAt(10),
        endTime: tomorrowAt(11, 30),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza Conflict si SELECT FOR UPDATE devuelve una reserva solapada', async () => {
    prisma.__tx.$queryRaw.mockResolvedValueOnce([{ id: 'res-overlap' }]);
    await expect(
      service.create(user, {
        courtId: activeCourt.id,
        startTime: tomorrowAt(10),
        endTime: tomorrowAt(11, 30),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.__tx.reservation.create).not.toHaveBeenCalled();
  });

  it('persiste la reserva con status CONFIRMED y emite el evento luego del commit', async () => {
    const start = tomorrowAt(10);
    const end = tomorrowAt(11, 30);
    prisma.__tx.reservation.create.mockResolvedValueOnce({
      id: 'res-1',
      userId: user.id,
      courtId: activeCourt.id,
      startTime: start,
      endTime: end,
      status: ReservationStatus.CONFIRMED,
    });

    const result = await service.create(user, {
      courtId: activeCourt.id,
      startTime: start,
      endTime: end,
    });

    expect(result.id).toBe('res-1');
    expect(prisma.__tx.reservation.create).toHaveBeenCalledTimes(1);
    expect(prisma.__tx.reservation.create.mock.calls[0][0].data.status).toBe(
      ReservationStatus.CONFIRMED,
    );

    // El evento se emite DESPUÉS del commit (es decir, fuera de $transaction).
    expect(events.emit).toHaveBeenCalledWith(
      'reservation.confirmed',
      expect.objectContaining({ userEmail: 'test@test.local' }),
    );
  });

  it('utiliza el nivel de aislamiento Serializable', async () => {
    const start = tomorrowAt(10);
    prisma.__tx.reservation.create.mockResolvedValueOnce({
      id: 'res-1',
      userId: user.id,
      courtId: activeCourt.id,
      startTime: start,
      endTime: tomorrowAt(11, 30),
      status: ReservationStatus.CONFIRMED,
    });

    await service.create(user, {
      courtId: activeCourt.id,
      startTime: start,
      endTime: tomorrowAt(11, 30),
    });

    const txOptions = prisma.$transaction.mock.calls[0][1];
    expect(txOptions.isolationLevel).toBe(
      Prisma.TransactionIsolationLevel.Serializable,
    );
  });

  it('reintenta ante un error P2034 (serialization failure) y termina exitosamente', async () => {
    const start = tomorrowAt(10);
    const end = tomorrowAt(11, 30);

    const serializationErr = new Prisma.PrismaClientKnownRequestError(
      'Transaction failed due to a write conflict or a deadlock',
      { code: 'P2034', clientVersion: 'test' },
    );

    // Primera invocación: falla con P2034.
    // Segunda invocación: éxito.
    let calls = 0;
    prisma.$transaction.mockImplementation(async (cb: any) => {
      calls += 1;
      if (calls === 1) throw serializationErr;
      return cb(prisma.__tx);
    });

    prisma.__tx.reservation.create.mockResolvedValueOnce({
      id: 'res-retry',
      userId: user.id,
      courtId: activeCourt.id,
      startTime: start,
      endTime: end,
      status: ReservationStatus.CONFIRMED,
    });

    const result = await service.create(user, {
      courtId: activeCourt.id,
      startTime: start,
      endTime: end,
    });

    expect(result.id).toBe('res-retry');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('NO reintenta si el error no es de serialización (propaga ConflictException)', async () => {
    prisma.__tx.$queryRaw.mockResolvedValueOnce([{ id: 'overlap' }]);
    await expect(
      service.create(user, {
        courtId: activeCourt.id,
        startTime: tomorrowAt(10),
        endTime: tomorrowAt(11, 30),
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    // El callback de $transaction se invoca una sola vez.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
