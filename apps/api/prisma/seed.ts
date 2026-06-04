/**
 * ===========================================================================
 *  seed.ts - Carga de datos iniciales para entorno de desarrollo y pruebas.
 * ---------------------------------------------------------------------------
 *  Crea:
 *    - 1 usuario administrador.
 *    - 2 usuarios estándar (clientes).
 *    - 2 canchas de pádel activas.
 *    - 3 reservas de ejemplo (mañana, tarde y noche del día siguiente).
 *
 *  Idempotencia: utiliza upsert por email / nombre de cancha para poder
 *  ejecutar el seed varias veces sin generar duplicados.
 *
 *  Ejecución:
 *    npm run seed      (desde apps/api)
 *
 *  REFERENCIA INFORME - Capítulo 5: Implementación
 *  Sección: Datos de prueba y entorno de demostración
 *  Descripción académica: La presencia de un script de seed reproducible
 *    permite a los evaluadores del trabajo final ejecutar la aplicación con
 *    un conjunto consistente de datos representativos del dominio.
 * ===========================================================================
 */

import { PrismaClient, Role, SportType, ReservationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Hashea una contraseña con bcrypt (10 rounds — equilibrio entre coste
 * computacional y seguridad para un entorno académico).
 */
async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Devuelve una nueva fecha desplazada N días desde hoy a la hora indicada
 * (en horario local del servidor). Útil para programar reservas demo.
 */
function dateInDays(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main(): Promise<void> {
  console.log('🌱  Iniciando seed de la base de datos...');

  // -------------------------------------------------------------------------
  // 1) Usuarios
  // -------------------------------------------------------------------------
  const adminPassword = await hash('Admin123!');
  const userPassword = await hash('User123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@padelturnos.local' },
    update: {},
    create: {
      name: 'Administrador del Complejo',
      email: 'admin@padelturnos.local',
      password: adminPassword,
      phone: '+543482000000',
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'juan.perez@example.com' },
    update: {},
    create: {
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      password: userPassword,
      phone: '+543482111111',
      role: Role.USER,
      isEmailVerified: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'maria.gomez@example.com' },
    update: {},
    create: {
      name: 'María Gómez',
      email: 'maria.gomez@example.com',
      password: userPassword,
      phone: '+543482222222',
      role: Role.USER,
      isEmailVerified: true,
    },
  });

  console.log(`👤  Usuarios listos: admin=${admin.email}, u1=${user1.email}, u2=${user2.email}`);

  // -------------------------------------------------------------------------
  // 2) Canchas
  // -------------------------------------------------------------------------
  // Como `name` no es UNIQUE en la base, primero buscamos por nombre y
  // creamos solo si no existe (upsert manual idempotente).
  let courtNorte = await prisma.court.findFirst({ where: { name: 'Cancha Norte' } });
  if (!courtNorte) {
    courtNorte = await prisma.court.create({
      data: {
        name: 'Cancha Norte',
        sportType: SportType.PADEL,
        description: 'Cancha techada con paredes de blindex y césped sintético azul.',
        isActive: true,
        pricePerHour: 6000.00,
      },
    });
  }

  let courtSur = await prisma.court.findFirst({ where: { name: 'Cancha Sur' } });
  if (!courtSur) {
    courtSur = await prisma.court.create({
      data: {
        name: 'Cancha Sur',
        sportType: SportType.PADEL,
        description: 'Cancha al aire libre con iluminación LED y césped verde.',
        isActive: true,
        pricePerHour: 5500.00,
      },
    });
  }

  console.log(`🎾  Canchas listas: ${courtNorte.name}, ${courtSur.name}`);

  // -------------------------------------------------------------------------
  // 3) Reservas de ejemplo (día siguiente)
  // -------------------------------------------------------------------------
  // Slots de 90 minutos según la lógica de disponibilidad del Paso 4.
  //   - Mañana:  09:00 - 10:30   → Juan en Cancha Norte (CONFIRMED)
  //   - Tarde:   16:30 - 18:00   → María en Cancha Sur  (CONFIRMED)
  //   - Noche:   21:00 - 22:30   → Juan en Cancha Norte (PENDING)
  // Antes de insertar limpiamos las reservas previas del mismo día para
  // garantizar la idempotencia del seed.
  const tomorrow = dateInDays(1, 0);
  const dayAfter = dateInDays(2, 0);

  await prisma.reservation.deleteMany({
    where: {
      startTime: { gte: tomorrow, lt: dayAfter },
    },
  });

  await prisma.reservation.createMany({
    data: [
      {
        userId: user1.id,
        courtId: courtNorte.id,
        startTime: dateInDays(1, 9, 0),
        endTime: dateInDays(1, 10, 30),
        status: ReservationStatus.CONFIRMED,
        notes: 'Partido de práctica matutino.',
      },
      {
        userId: user2.id,
        courtId: courtSur.id,
        startTime: dateInDays(1, 16, 30),
        endTime: dateInDays(1, 18, 0),
        status: ReservationStatus.CONFIRMED,
        notes: 'Clase con profesor.',
      },
      {
        userId: user1.id,
        courtId: courtNorte.id,
        startTime: dateInDays(1, 21, 0),
        endTime: dateInDays(1, 22, 30),
        status: ReservationStatus.PENDING,
        notes: 'Pendiente de confirmación del cuarto jugador.',
      },
    ],
  });

  console.log('📅  3 reservas de ejemplo creadas.');

  // -------------------------------------------------------------------------
  // 4) Información del club (singleton)
  // -------------------------------------------------------------------------
  await prisma.clubInfo.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      address: 'Av. San Martín 1234, Reconquista, Santa Fe',
      mapEmbedUrl: null,
      weekdayHours: '13:00 a 23:00',
      weekendHours: '13:00 a 23:00',
      holidayHours: '13:00 a 23:00',
      services: [
        'Wi-Fi',
        'Vestuario',
        'Bar / Restaurante',
        'Disposición de paletas',
        'Estacionamiento',
      ],
    },
  });
  console.log('🏟️   Info del club lista.');

  console.log('✅  Seed completado con éxito.');
}

main()
  .catch((error) => {
    // Logger explícito a nivel de script de mantenimiento; no se usa
    // LoggerService aquí porque seed.ts se ejecuta fuera del contexto Nest.
    console.error('❌  Error ejecutando el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
