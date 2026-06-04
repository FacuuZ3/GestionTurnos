# Capítulo 5 — Implementación

Este capítulo documenta el desarrollo concreto del sistema. Cada sección
describe un subsistema, presenta fragmentos relevantes del código fuente
y explica las decisiones puntuales que se tomaron. Los listados están
acortados por brevedad; el código completo se encuentra en el repositorio
del proyecto.

## 5.1 Stack tecnológico

La tabla siguiente resume las tecnologías adoptadas con sus versiones y
roles en el sistema.

### 5.1.1 Backend

| Componente | Versión | Rol |
|---|---|---|
| Node.js | 20.x LTS | Runtime de JavaScript del lado del servidor |
| TypeScript | 5.3+ | Lenguaje principal, modo estricto |
| NestJS | 10.3+ | Framework de aplicación modular |
| Prisma ORM | 5.8+ | Mapeo objeto-relacional y migraciones |
| PostgreSQL | 16 (Alpine) | Motor de base de datos relacional |
| Passport + JWT | 0.7 / 10.2 | Estrategias de autenticación |
| bcrypt | 5.1+ | Hashing de contraseñas |
| Nodemailer | 6.9+ | Cliente SMTP |
| class-validator | 0.14+ | Validación declarativa de DTOs |
| class-transformer | 0.5+ | Transformación de DTOs |
| Joi | 17.11+ | Validación de variables de entorno |
| Winston | 3.11+ | Logger estructurado |
| Helmet | 7.1+ | Headers HTTP de seguridad |
| `@nestjs/schedule` | 4.0+ | Cron jobs |
| `@nestjs/terminus` | 10.2+ | Health checks |
| `@nestjs/swagger` | 7.3+ | Generación de OpenAPI |
| `@nestjs/throttler` | 5.1+ | Rate limiting |
| Jest | 29.7+ | Testing unitario |

### 5.1.2 Frontend

| Componente | Versión | Rol |
|---|---|---|
| Next.js | 14.1 | Framework de aplicación React con SSR |
| React | 18.2 | Biblioteca de UI |
| TypeScript | 5.3+ | Lenguaje principal, modo estricto |
| Tailwind CSS | 3.4+ | Estilos utility-first |
| React Hook Form | 7.49+ | Manejo de formularios |
| Zod | 3.22+ | Validación de esquemas tipada |
| TanStack Query | 5.17+ | Cache y sincronización de estado servidor |
| date-fns | 3.2+ | Manipulación y formato de fechas |
| react-day-picker | 8.10+ | Componente de calendario |
| react-big-calendar | 1.8+ | Calendario semanal (legacy) |
| Recharts | 2.12+ | Gráficos para el dashboard estadístico |
| next-themes | 0.3+ | Soporte de modo claro/oscuro |
| Geist | 1.3+ | Tipografía (sans + mono) |
| Lucide React | 0.314+ | Íconos SVG |
| Radix UI | varios | Primitivas accesibles (dialog, popover) |
| Playwright | 1.41+ | Testing end-to-end |

### 5.1.3 Infraestructura

| Componente | Rol |
|---|---|
| Docker + docker-compose | Containerización y orquestación local |
| GitHub Actions | Integración continua |
| npm workspaces | Monorepo (apps/api y apps/web) |

---

## 5.2 Estructura del repositorio

El monorepo está organizado de manera que cada subproyecto sea
independiente pero pueda compartir scripts a nivel raíz:

```
padel-turnos/
├── .github/
│   └── workflows/
│       └── ci.yml                ← Pipeline de CI
├── apps/
│   ├── api/                      ← Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma     ← Modelo de datos
│   │   │   ├── seed.ts           ← Datos de prueba
│   │   │   └── migrations/       ← Historial de migraciones
│   │   ├── src/
│   │   │   ├── auth/             ← Subsistema de autenticación
│   │   │   ├── users/
│   │   │   ├── courts/
│   │   │   ├── reservations/     ← Subsistema crítico
│   │   │   ├── recurring-
│   │   │   │   reservations/
│   │   │   ├── notifications/
│   │   │   ├── club-info/
│   │   │   ├── audit/
│   │   │   ├── health/
│   │   │   ├── common/           ← Filtros, guards, interceptors,
│   │   │   │                       decoradores, utilidades transversales
│   │   │   ├── config/
│   │   │   ├── prisma/           ← PrismaService inyectable
│   │   │   ├── app.module.ts
│   │   │   └── main.ts           ← Bootstrap
│   │   ├── .env.example
│   │   └── package.json
│   └── web/                      ← Frontend Next.js
│       ├── app/                  ← App Router
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   └── register/
│       │   ├── dashboard/
│       │   │   ├── user/
│       │   │   └── admin/
│       │   ├── forgot-password/
│       │   ├── reset-password/
│       │   ├── verify-email/
│       │   ├── layout.tsx
│       │   └── page.tsx          ← Landing
│       ├── components/
│       │   ├── ui/               ← Primitivas (Button, Input, etc.)
│       │   ├── landing/
│       │   └── …
│       ├── lib/
│       │   ├── api.ts            ← Cliente HTTP tipado
│       │   ├── auth.ts           ← Manejo de sesión
│       │   ├── schemas.ts        ← Esquemas Zod
│       │   ├── types.ts
│       │   └── utils.ts
│       ├── e2e/                  ← Tests Playwright
│       ├── playwright.config.ts
│       └── package.json
├── docker-compose.yml
├── package.json                  ← Workspaces npm
└── README.md
```

---

## 5.3 Subsistema de Autenticación

El módulo `AuthModule` cubre los flujos de registro, login, refresh,
verificación de email y reseteo de contraseña.

### 5.3.1 Hashing de contraseñas con bcrypt

Las contraseñas nunca se persisten en texto plano. El servicio
`AuthService` aplica bcrypt con 10 rondas tanto al alta como al reset:

```typescript
const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
```

La verificación en el login utiliza `bcrypt.compare`, que internamente
ejecuta el mismo algoritmo sobre el password ingresado y compara el hash
resultante en tiempo constante (resistente a *timing attacks*).

### 5.3.2 Emisión dual de tokens

El método `signTokens(user)` emite ambos tokens con secretos distintos:

```typescript
const accessToken = await this.jwt.signAsync(payload, {
  secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
  expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
});

const refreshToken = await this.jwt.signAsync(payload, {
  secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
  expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
});
```

Esta separación implica que un atacante que obtenga uno de los dos
secretos no puede falsificar el otro tipo de token, limitando el blast
radius de un eventual compromiso.

### 5.3.3 Guards y decoradores transversales

El proyecto define un `JwtAuthGuard` global que requiere autenticación
en todos los endpoints. Las rutas públicas se marcan con un decorador
`@Public()` que el guard inspecciona vía `Reflector`:

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

La autorización por rol se implementa de manera análoga con un
`RolesGuard` que se aplica selectivamente con `@Roles(Role.ADMIN)`.

### 5.3.4 Anti-enumeración en reseteo de contraseña

El endpoint `POST /auth/forgot-password` devuelve siempre la misma
respuesta exista o no la cuenta, mitigando ataques de enumeración:

```typescript
async forgotPassword(email: string): Promise<{ message: string }> {
  const token = randomUUID() + randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  const user = await this.users.assignPasswordResetToken(email, token, expiresAt);
  if (user) {
    await this.notifications.sendPasswordResetEmail(user.email, user.name, token);
  }

  return {
    message:
      'Si el email está registrado, te enviamos un enlace para restablecer tu contraseña.',
  };
}
```

---

## 5.4 Subsistema de Reservas con control de concurrencia

Esta sección documenta el aporte técnico más significativo del trabajo.

### 5.4.1 Flujo general

El método `ReservationsService.create(user, dto)` orquesta la creación
de una reserva. Su lógica completa puede sintetizarse en:

```typescript
async create(user: AuthUser, dto: CreateReservationDto): Promise<Reservation> {
  const created = await this.withSerializableRetry(() =>
    this.runCreateAttempt(user, dto),
  );

  // El evento se publica DESPUÉS del commit exitoso.
  await this.emitReservationConfirmed(created.id);
  return created;
}
```

El método `runCreateAttempt` ejecuta el cuerpo dentro de una transacción
serializable. Si PostgreSQL aborta la transacción por conflicto de
serialización (`40001 / P2034`), `withSerializableRetry` reintenta hasta
tres veces con backoff exponencial. El evento de dominio se emite
sólo si el commit fue exitoso.

### 5.4.2 Cuerpo transaccional comentado

El cuerpo de `runCreateAttempt`, con sus pasos numerados:

```typescript
private runCreateAttempt(
  user: AuthUser,
  dto: CreateReservationDto,
): Promise<Reservation> {
  return this.prisma.$transaction(
    async (tx) => {
      // (a) Validación de invariantes de dominio.
      if (dto.startTime.getTime() >= dto.endTime.getTime()) {
        throw new BadRequestException('startTime debe ser anterior a endTime.');
      }
      if (dto.startTime.getTime() < Date.now()) {
        throw new BadRequestException('No se pueden reservar turnos en el pasado.');
      }

      // (a.2) Reglas de negocio (anticipación min/max + cupo).
      // ADMIN exento.
      const isAdmin = user.role === Role.ADMIN;
      if (!isAdmin) {
        // ... ver sección 5.4.3
      }

      // (b) Verificación de cancha activa DENTRO de la tx (evita TOCTOU).
      const court = await tx.court.findUnique({ where: { id: dto.courtId } });
      if (!court) throw new NotFoundException('Cancha no encontrada.');
      if (!court.isActive) {
        throw new BadRequestException('La cancha no está habilitada.');
      }

      // (c) SELECT ... FOR UPDATE sobre las reservas potencialmente solapadas.
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
        throw new ConflictException(
          'El horario solicitado ya está reservado para esta cancha.',
        );
      }

      // (c.2) Verificación contra TURNOS FIJOS.
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

      // (d) INSERT.
      return tx.reservation.create({
        data: {
          userId: user.id,
          courtId: dto.courtId,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: ReservationStatus.CONFIRMED,
          notes: dto.notes,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    },
  );
}
```

**Análisis de las cláusulas críticas:**

- El criterio de solapamiento `a < d ∧ c < b` (en SQL: `startTime <
  endTime_pedido AND endTime > startTime_pedido`) es la formulación
  canónica de "dos rangos se cruzan".
- La cláusula `FOR UPDATE` bloquea las filas devueltas hasta el final
  de la transacción, previniendo modificaciones concurrentes (por
  ejemplo, una cancelación simultánea sobre una reserva en conflicto).
- El nivel `Serializable` garantiza que phantom reads sean detectados:
  si dos transacciones obtienen "cero filas" en el SELECT y ambas
  insertan, PostgreSQL aborta una con `40001`.
- Los timeouts (`maxWait: 5_000`, `timeout: 10_000`) acotan el daño
  ante locks colgados.

### 5.4.3 Aplicación de las reglas de negocio

Dentro de la transacción se verifican las reglas centralizadas en
`booking-policy.ts`:

```typescript
if (!isAdmin) {
  const hours = hoursFromNow(dto.startTime);
  const days = daysFromNow(dto.startTime);

  if (hours < BOOKING_POLICY.MIN_HOURS_BEFORE_START_TO_BOOK) {
    throw new BadRequestException(
      `Las reservas deben hacerse con al menos ` +
      `${BOOKING_POLICY.MIN_HOURS_BEFORE_START_TO_BOOK}h de anticipación.`,
    );
  }
  if (days > BOOKING_POLICY.MAX_DAYS_AHEAD) {
    throw new BadRequestException(
      `Solo se puede reservar con hasta ` +
      `${BOOKING_POLICY.MAX_DAYS_AHEAD} días de anticipación.`,
    );
  }

  // Conteo de reservas activas DENTRO de la transacción (evita TOCTOU).
  const activeCount = await tx.reservation.count({
    where: {
      userId: user.id,
      status: { not: ReservationStatus.CANCELLED },
      startTime: { gte: new Date() },
    },
  });
  if (activeCount >= BOOKING_POLICY.MAX_ACTIVE_RESERVATIONS_PER_USER) {
    throw new BadRequestException(
      `Alcanzaste el límite de ` +
      `${BOOKING_POLICY.MAX_ACTIVE_RESERVATIONS_PER_USER} reservas activas.`,
    );
  }
}
```

El conteo de reservas activas se ejecuta **dentro de la transacción**
porque si se ejecutara fuera, entre la verificación y el INSERT podría
crearse otra reserva concurrente que rompa el cupo (anomalía TOCTOU,
*time-of-check to time-of-use*).

### 5.4.4 Mecanismo de reintento

El helper `withSerializableRetry` encapsula la lógica de reintento:

```typescript
private async withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (this.isSerializationError(err) && attempt < MAX_SERIALIZATION_RETRIES) {
        attempt += 1;
        // Backoff exponencial: 20ms, 40ms, 80ms.
        await new Promise((r) => setTimeout(r, 20 * 2 ** (attempt - 1)));
        this.logger.warn(
          `Conflicto SSI (intento ${attempt}/${MAX_SERIALIZATION_RETRIES}).`,
        );
        continue;
      }
      throw err;
    }
  }
}

private isSerializationError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2034') return true;
  }
  const message = (err as Error)?.message ?? '';
  return /40001|serialization_failure/i.test(message);
}
```

Sólo se reintentan errores de serialización (P2034 / 40001 /
`serialization_failure`). Cualquier otra excepción (`ConflictException`
por solapamiento real, `BadRequestException` por regla de negocio) se
propaga inmediatamente al cliente.

### 5.4.5 Emisión post-commit del evento de dominio

Una vez que la transacción confirma exitosamente, se publica el evento:

```typescript
private async emitReservationConfirmed(reservationId: string): Promise<void> {
  const payload = await this.buildEventPayload(reservationId);
  if (payload) this.events.emit('reservation.confirmed', payload);
}
```

El listener `ReservationListener` está suscripto a este evento y
delega el envío de la confirmación por email al
`NotificationsService`. La separación garantiza que ningún email se
envíe por una reserva que terminó en rollback (patrón *outbox
simplificado*).

---

## 5.5 Subsistema de Notificaciones

El módulo `NotificationsModule` aplica el patrón **Strategy** para
soportar múltiples canales de notificación sin acoplar el productor
a una implementación concreta.

### 5.5.1 Interfaz común

```typescript
export interface INotificationChannel {
  readonly name: string;
  send(payload: NotificationPayload): Promise<void>;
}

export interface NotificationPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}
```

### 5.5.2 Implementación de EmailChannel

`EmailChannel` encapsula Nodemailer y degrada gracefully en
desarrollo si SMTP no está disponible:

```typescript
@Injectable()
export class EmailChannel implements INotificationChannel {
  readonly name = 'email';

  async send(payload: NotificationPayload): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, ...payload });
    } catch (err) {
      const env = this.config.get<string>('NODE_ENV');
      if (env !== 'production') {
        this.logger.warn(`SMTP no disponible. Simulando envío.`);
        this.logger.debug(`[SIMULADO] ${payload.subject}\n${payload.text}`);
        return;
      }
      throw err;
    }
  }
}
```

### 5.5.3 Fachada y registro de canales

`NotificationsService` mantiene un `Map` de canales y delega:

```typescript
private async dispatch(channel: string, payload: NotificationPayload): Promise<void> {
  const target = this.channels.get(channel);
  if (!target) return;
  await target.send(payload);
}
```

Agregar un canal `WhatsAppChannel` mañana es trivial: implementar
`INotificationChannel`, declararlo como provider y registrarlo en el
`Map` del constructor.

### 5.5.4 Listener de eventos

`ReservationListener` suscribe a los eventos del dominio:

```typescript
@OnEvent('reservation.confirmed', { async: true })
async onConfirmed(payload: ReservationEventPayload): Promise<void> {
  await this.notifications.sendReservationConfirmed(
    payload.userEmail,
    payload.userName,
    payload.courtName,
    payload.startTime,
  );
}
```

---

## 5.6 Tareas programadas (recordatorios)

El módulo `ReservationsModule` incluye un `ReminderService` que
implementa el cron job de recordatorios horarios.

```typescript
@Injectable()
export class ReminderService {
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTick(): Promise<void> {
    const count = await this.runOnce();
    if (count > 0) {
      this.logger.log(`Recordatorios enviados: ${count}.`);
    }
  }

  async runOnce(): Promise<number> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3600 * 1000);

    const pending = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        reminderSent: false,
        startTime: { gt: now, lte: windowEnd },
      },
      include: { user: true, court: true },
    });

    let ok = 0;
    for (const r of pending) {
      try {
        await this.notifications.sendReservationReminder(/* ... */);
        await this.prisma.reservation.update({
          where: { id: r.id },
          data: { reminderSent: true },
        });
        ok += 1;
      } catch (err) {
        // No marcamos reminderSent: el próximo tick reintentará.
        this.logger.error(`Fallo enviando recordatorio ${r.id}`);
      }
    }
    return ok;
  }
}
```

**Propiedades del diseño:**

- **Idempotencia**: el flag `reminderSent` garantiza que cada reserva
  reciba un único recordatorio aun ante reinicios del proceso.
- **Tolerancia a fallos**: si falla el envío, `reminderSent` no se
  actualiza y el siguiente tick reintenta.
- **Ventana ancha**: la ventana de 25 hs cubre eventuales ticks
  perdidos (por ejemplo, por reinicio del servidor durante la ejecución).

---

## 5.7 Subsistema administrativo

Los módulos `CourtsModule`, `RecurringReservationsModule`,
`ClubInfoModule` y `StatsService` componen el subsistema
administrativo, con endpoints protegidos por el `RolesGuard`.

### 5.7.1 Borrado en dos pasos de canchas

La eliminación definitiva de una cancha es un flujo controlado:

```typescript
async hardDelete(id: string): Promise<{ id: string; deletedReservations: number }> {
  const court = await this.findByIdOrThrow(id);

  if (court.isActive) {
    throw new BadRequestException(
      'Primero suspendé la cancha y después podrás eliminarla definitivamente.',
    );
  }

  // Transacción: eliminamos primero las reservas (FK Restrict), luego la cancha.
  // Los turnos fijos caen por cascade.
  const deletedReservations = await this.prisma.$transaction(async (tx) => {
    const res = await tx.reservation.deleteMany({ where: { courtId: id } });
    await tx.court.delete({ where: { id } });
    return res.count;
  });

  return { id, deletedReservations };
}
```

La transacción garantiza atomicidad: si el `DELETE FROM courts` fallara
por algún motivo, las reservas tampoco se borrarían.

### 5.7.2 Cálculo de métricas

`StatsService` consume las reservas del período seleccionado y agrega
todas las métricas in-memory:

```typescript
async getStats(daysParam?: number): Promise<StatsResponse> {
  const days = daysParam ?? 30;
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const confirmedRes = await this.prisma.reservation.findMany({
    where: { status: ReservationStatus.CONFIRMED, startTime: { gte: from, lt: to } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      court: { select: { id: true, name: true, pricePerHour: true } },
    },
  });

  // Facturación estimada total y por cancha
  const byCourtMap = new Map<string, ...>();
  for (const r of confirmedRes) {
    const hours = (r.endTime.getTime() - r.startTime.getTime()) / 3_600_000;
    const revenue = hours * Number(r.court.pricePerHour);
    // ... acumula por cancha
  }

  // Heatmap día × hora
  const heatmapMap = new Map<string, number>();
  for (const r of confirmedRes) {
    const key = `${r.startTime.getDay()}-${r.startTime.getHours() * 60 + r.startTime.getMinutes()}`;
    heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
  }

  return { /* totals, revenue, occupancy, topUsers, heatmap */ };
}
```

Para volúmenes del orden de un complejo deportivo (centenares a miles
de reservas anuales) el cómputo in-memory es perfectamente eficiente
y elimina la complejidad de mantener consultas SQL agregadas.

---

## 5.8 Observabilidad

### 5.8.1 Health checks

El módulo `HealthModule` expone dos endpoints diferenciados:

```typescript
@Public()
@Get()
liveness() {
  return this.health.check([]);
}

@Public()
@Get('readiness')
readiness() {
  return this.health.check([
    () => this.prismaIndicator.pingCheck('database', this.prisma),
    () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
  ]);
}
```

`/health` siempre responde `200 OK` si el proceso responde; `/health/readiness`
devuelve `503 Service Unavailable` si la base de datos no está accesible
o el uso de memoria excede los umbrales configurados.

### 5.8.2 Logger estructurado con Winston

El bootstrap utiliza Winston como logger global, con formato distinto
según el entorno:

```typescript
const app = await NestFactory.create(AppModule, {
  logger: WinstonModule.createLogger(buildLoggerOptions(env)),
});
```

En desarrollo los logs son humanos (timestamps cortos, colores). En
producción son JSON con rotación de archivos a 5 MB, listos para ser
ingestados por herramientas como ELK o CloudWatch.

### 5.8.3 Audit log automático

El `AuditInterceptor` se aplica globalmente y registra
automáticamente toda mutación realizada por un admin:

```typescript
return next.handle().pipe(
  tap((response: unknown) => {
    void this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: req.method.toUpperCase(),
      resource: extractResource(req.originalUrl ?? ''),
      resourceId: req.params?.id ?? extractIdFromResponse(response) ?? null,
      ip: req.ip ?? null,
      metadata: {
        url: req.originalUrl,
        body: sanitizeBody(req.body),
      },
    });
  }),
);
```

El registro se ejecuta en el `tap` posterior — si la operación falla,
no se loguea. El campo `metadata.body` pasa por `sanitizeBody` que
redacta campos sensibles (contraseñas, tokens) antes de persistir.

---

## 5.9 Frontend

### 5.9.1 Cliente HTTP tipado con refresh automático

El módulo `lib/api.ts` encapsula `fetch` con lógica de refresh ante
401:

```typescript
let res = await fetch(url, {
  method,
  headers: buildHeaders(getAccessToken()),
  body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
});

if (res.status === 401 && !options.anonymous) {
  const newToken = await attemptRefresh();
  if (newToken) {
    res = await fetch(url, {
      method,
      headers: buildHeaders(newToken),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } else {
    clearSession();
  }
}
```

Si el access token expira, el cliente intenta renovarlo con el refresh
token y reintenta la request original — sin que el usuario se entere.

### 5.9.2 Estado servidor con TanStack Query

Todos los datos del servidor se acceden con `useQuery` / `useMutation`,
con cache, deduplicación e invalidación cruzada:

```typescript
const cancelMutation = useMutation({
  mutationFn: (id: string) =>
    api<ReservationDto>(`/reservations/${id}/cancel`, { method: 'PATCH' }),
  onSuccess: () => {
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0];
        return (
          key === 'my-reservations' ||
          key === 'admin-reservations' ||
          key === 'timeline-availability'
        );
      },
    });
  },
});
```

La invalidación por predicado permite refrescar todas las vistas
relacionadas (panel del usuario, panel del admin, calendario) con una
sola línea, sin acoplar el componente a los nombres específicos de
queries.

### 5.9.3 Middleware de protección de rutas

Next.js permite proteger rutas a nivel de middleware antes de
renderizar:

```typescript
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value;

  if (pathname.startsWith('/dashboard/admin')) {
    if (!accessToken) return redirect(req, '/login');
    if (role !== 'ADMIN') return redirect(req, '/dashboard/user');
  }
  if (pathname.startsWith('/dashboard/user')) {
    if (!accessToken) return redirect(req, '/login');
  }

  return NextResponse.next();
}
```

Esta capa adicional de protección complementa los guards del backend:
un usuario sin sesión es redirigido antes de que el componente se
renderice, mejorando UX y reduciendo la superficie de ataque.

### 5.9.4 Visualización Gantt horizontal de la disponibilidad

El componente `CourtsTimeline` renderiza las canchas en filas y los
turnos como barras posicionadas proporcionalmente sobre la franja
operativa:

```typescript
function slotPosition(slot: AvailabilitySlot) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  return {
    left: ((startMin - OPEN_MIN) / DAY_RANGE) * 100,
    width: ((endMin - startMin) / DAY_RANGE) * 100,
  };
}
```

Cada barra se posiciona con `left` y `width` en porcentajes
calculados sobre la franja operativa (540 minutos entre 13:00 y
22:00). Las canchas suspendidas se renderizan con textura diagonal
y sin slots clickeables, manteniéndolas visibles pero inertes.

---
