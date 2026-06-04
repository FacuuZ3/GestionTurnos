# Capítulo 4 — Diseño del Sistema

Este capítulo formaliza la arquitectura del sistema, su modelo de datos
relacional, las clases del dominio, la división en subsistemas, las reglas
de negocio centralizadas y las decisiones de diseño justificadas.

Los diagramas se presentan en formato ASCII para mantener la portabilidad
del documento; sus equivalentes en notación UML estándar se elaboraron
con la herramienta draw.io y se incluyen en los anexos del informe.

## 4.1 Arquitectura general

### 4.1.1 Vista de despliegue

El sistema se despliega en cuatro nodos lógicos: el cliente (navegador),
el frontend (servidor Next.js), el backend (servidor NestJS) y la base
de datos PostgreSQL. Existen además dos servicios externos: el proveedor
SMTP que entrega los correos electrónicos al destinatario final, y el
*scheduler* interno del backend que dispara los recordatorios horarios.

```
   ┌──────────────────┐
   │   Navegador      │
   │   (Cliente Web)  │
   └────────┬─────────┘
            │ HTTPS
            ▼
   ┌──────────────────┐         ┌──────────────────┐
   │  Next.js Server  │  HTTPS  │  NestJS API      │
   │  (port 3000)     ├────────►│  (port 3001)     │
   │                  │         │                  │
   │  - SSR / RSC     │         │  - Controllers   │
   │  - Routing       │         │  - Guards        │
   │  - Static assets │         │  - Interceptors  │
   └──────────────────┘         │  - Services      │
                                │  - Prisma Client │
                                └──┬───────────┬───┘
                                   │           │
                                   │           │ SMTP
                                   │           ▼
                                   │   ┌──────────────┐
                                   │   │  Proveedor   │
                                   │   │  SMTP        │
                                   │   └──────────────┘
                                   ▼
                            ┌────────────────┐
                            │  PostgreSQL 16 │
                            │  (port 5432)   │
                            │                │
                            │  - tablas      │
                            │  - índices     │
                            │  - constraints │
                            └────────────────┘
```

### 4.1.2 Comunicación entre componentes

- **Cliente ↔ Frontend**: HTTP / HTTPS. El cliente solicita HTML, JS y
  CSS al servidor Next.js. Parte del contenido se renderiza en el
  servidor (Server Components) y parte se hidrata en el navegador
  (Client Components).
- **Frontend ↔ Backend**: HTTP / HTTPS. El frontend consume la API REST
  del backend en `http://localhost:3001/api/*`. Los requests
  autenticados portan un header `Authorization: Bearer <jwt>`.
- **Backend ↔ Base de datos**: Protocolo nativo de PostgreSQL sobre
  TCP. El Prisma Client mantiene un *pool* de conexiones.
- **Backend → SMTP**: Protocolo SMTP sobre TCP/TLS. Sólo en envíos
  iniciados por el subsistema de notificaciones.

### 4.1.3 Arquitectura por capas (backend)

Internamente, el backend está organizado en capas claramente definidas:

```
   ┌────────────────────────────────────────────────────┐
   │  PRESENTACIÓN                                       │
   │  Controllers (HTTP)                                 │
   │  Validation Pipes • DTOs                            │
   └────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌────────────────────────────────────────────────────┐
   │  TRANSVERSAL                                        │
   │  Guards (Auth, Roles) • Interceptors (Logging,      │
   │  Audit) • Exception Filters                         │
   └────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌────────────────────────────────────────────────────┐
   │  DOMINIO                                            │
   │  Services • Reglas de negocio • Event Emitter       │
   └────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌────────────────────────────────────────────────────┐
   │  PERSISTENCIA                                       │
   │  PrismaService • PrismaClient generado              │
   └────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌────────────────────────────────────────────────────┐
   │  INFRAESTRUCTURA                                    │
   │  PostgreSQL • SMTP • Cron Scheduler                 │
   └────────────────────────────────────────────────────┘
```

La capa **transversal** se inserta entre Presentación y Dominio: cada
request pasa por los guards (autenticación / autorización), los
interceptors (logging, auditoría) y eventualmente los exception filters
antes de retornar al cliente. Las excepciones de cualquier capa son
capturadas por el `GlobalExceptionFilter` que normaliza la respuesta.

---

## 4.2 Modelo de datos

### 4.2.1 Diagrama Entidad-Relación

El modelo de datos comprende seis entidades principales más una entidad
auxiliar (`AuditLog`). El diagrama lógico, con las relaciones y
cardinalidades, es el siguiente:

```
   ┌────────────────┐                ┌──────────────────────┐
   │      User      │                │       Court          │
   ├────────────────┤                ├──────────────────────┤
   │ PK id (uuid)   │                │ PK id (uuid)         │
   │    name        │                │    name              │
   │    email *uniq │                │    sportType (enum)  │
   │    password    │                │    description       │
   │    phone?      │                │    isActive          │
   │    role (enum) │                │    pricePerHour      │
   │    isEmail-    │                │    createdAt         │
   │      Verified  │                │    updatedAt         │
   │    emailVerify │                └──────┬───────────────┘
   │      Token?    │                       │
   │    password-   │                       │
   │      Reset-    │                       │
   │      Token?    │                       │
   │    password-   │                       │
   │      Reset-    │                       │
   │      Expires?  │                       │
   │    createdAt   │                       │
   │    updatedAt   │                       │
   └────────┬───────┘                       │
            │ 1                       N     │
            │                               │
            │                               │
            │ N                       1     │
   ┌────────▼───────────────────────────────▼───────┐
   │            Reservation                          │
   ├─────────────────────────────────────────────────┤
   │ PK id (uuid)                                    │
   │ FK userId   (-> User.id)   onDelete: Restrict   │
   │ FK courtId  (-> Court.id)  onDelete: Restrict   │
   │    startTime (timestamptz)                      │
   │    endTime   (timestamptz)                      │
   │    status    (enum)                             │
   │    notes?                                       │
   │    reminderSent                                 │
   │    rescheduledAt?                               │
   │    createdAt / updatedAt                        │
   │                                                 │
   │ idx (courtId, startTime, endTime)               │
   │ idx (userId, startTime)                         │
   │ idx (status)                                    │
   └─────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────┐
   │           RecurringReservation                   │
   ├──────────────────────────────────────────────────┤
   │ PK id (uuid)                                     │
   │ FK courtId (-> Court.id)   onDelete: Cascade     │
   │    dayOfWeek (0..6)                              │
   │    startMinute (0..1439)                         │
   │    endMinute   (1..1440)                         │
   │    notes?                                        │
   │    isActive                                      │
   │    createdAt / updatedAt                         │
   │                                                  │
   │ idx (courtId, dayOfWeek, isActive)               │
   └──────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────┐
   │              ClubInfo (singleton)                │
   ├──────────────────────────────────────────────────┤
   │ PK id (= "default")                              │
   │    address                                       │
   │    mapEmbedUrl?                                  │
   │    weekdayHours / weekendHours / holidayHours    │
   │    services (text[])                             │
   │    createdAt / updatedAt                         │
   └──────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────┐
   │                  AuditLog                        │
   ├──────────────────────────────────────────────────┤
   │ PK id (uuid)                                     │
   │    actorId / actorEmail                          │
   │    action (VARCHAR)                              │
   │    resource / resourceId?                        │
   │    metadata (json)                               │
   │    ip?                                           │
   │    createdAt                                     │
   │                                                  │
   │ idx (actorId, createdAt)                         │
   │ idx (resource, resourceId)                       │
   │ idx (createdAt)                                  │
   └──────────────────────────────────────────────────┘
```

### 4.2.2 Cardinalidades y semántica

- **User 1—N Reservation**: un usuario puede tener múltiples reservas a
  lo largo del tiempo; cada reserva pertenece a un único usuario.
- **Court 1—N Reservation**: una cancha puede haber recibido múltiples
  reservas; cada reserva pertenece a una única cancha.
- **Court 1—N RecurringReservation**: una cancha puede tener múltiples
  bloqueos recurrentes (uno por slot semanal); cada bloqueo pertenece a
  una única cancha.

### 4.2.3 Decisiones de modelado

**UUID como clave primaria.** Todas las entidades del dominio (excepto
`ClubInfo` por su naturaleza singleton) usan `UUID v4` como PK. Esta
decisión:

- Evita la enumeración secuencial de recursos desde el cliente
  (`/courts/1`, `/courts/2` revelaría volumen).
- Permite generar identificadores del lado del cliente sin coordinar
  con la base.
- Facilita la fusión de datos entre entornos distintos sin colisiones.

**Política de borrado `Restrict` en Reservation.** Ninguna reserva
queda huérfana: si se intenta borrar un usuario o cancha con reservas
asociadas, PostgreSQL lo rechaza. Esto se relaja únicamente en el flujo
controlado de "eliminar cancha definitivamente" (RF-16), que elimina
las reservas en una transacción atómica antes de eliminar la cancha.

**Política de borrado `Cascade` en RecurringReservation.** Los
bloqueos recurrentes no tienen sentido sin su cancha asociada. Si la
cancha se elimina, sus turnos fijos se eliminan automáticamente.

**`Timestamptz` en lugar de `Timestamp`.** Los horarios de las
reservas se almacenan con zona horaria explícita, evitando ambigüedades
al desplegar en servidores con configuraciones regionales distintas.

**Arrays nativos para colecciones simples.** El campo
`ClubInfo.services` es un `text[]` de Postgres en lugar de una tabla
relacionada `service`. Para una colección sin atributos adicionales y
sin necesidad de búsqueda por elementos, el array nativo es más simple
y eficiente.

**Soft delete con `isActive`.** Las canchas (y los bloqueos
recurrentes) implementan borrado lógico mediante el campo booleano
`isActive`. Esto preserva el historial sin desordenar la base.

---

## 4.3 Diagrama de clases del dominio

A nivel de software, las entidades persistidas se materializan como tipos
TypeScript generados por Prisma. La estructura conceptual de los
servicios que orquestan la lógica de cada entidad puede modelarse como
sigue:

```
   ┌────────────────────────────────┐
   │       AuthService              │
   │  + register(dto)               │
   │  + verifyEmail(token)          │
   │  + login(dto)                  │
   │  + refresh(userId)             │
   │  + forgotPassword(email)       │
   │  + resetPassword(token, pass)  │
   │  - signTokens(user): TokenPair │
   └──────────────┬─────────────────┘
                  │ depends on
                  ▼
   ┌────────────────────────────────┐    ┌──────────────────────────┐
   │       UsersService             │    │  NotificationsService    │
   │  + create(data)                │    │  + sendVerificationEmail │
   │  + findByEmail(email)          │    │  + sendReservation-      │
   │  + findByIdOrThrow(id)         │    │    Confirmed / Cancelled │
   │  + verifyEmail(token)          │    │  + sendReservation-      │
   │  + updateProfile(id, data)     │    │    Reminder              │
   │  + changePassword(id, c, n)    │    │  + sendPasswordReset-    │
   │  + resetPasswordWithToken(...) │    │    Email                 │
   │  + assignPasswordResetToken    │    │  - dispatch(channel, p)  │
   └────────────────────────────────┘    └────────┬─────────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────────────┐
                                          │ INotificationChannel │
                                          │      <<interface>>   │
                                          │  + send(payload)     │
                                          └────────┬─────────────┘
                                                   │
                            ┌──────────────────────┴─────────────────────┐
                            │                                            │
                            ▼                                            ▼
                  ┌──────────────────┐                          ┌──────────────────┐
                  │   EmailChannel   │                          │ WhatsAppChannel  │
                  │  - transporter   │                          │   (stub)         │
                  │  + send(payload) │                          │  + send(payload) │
                  └──────────────────┘                          └──────────────────┘

   ┌─────────────────────────────────────────────┐
   │           ReservationsService               │
   │  + getAvailability(courtId, date)           │
   │  + listMine(userId)                         │
   │  + listAdmin(filters)                       │
   │  + create(user, dto)                        │
   │  + cancel(user, id)                         │
   │  + changeStatus(id, status)                 │
   │  + reschedule(id, dto)                      │
   │  - runCreateAttempt(user, dto): TX          │
   │  - withSerializableRetry(fn)                │
   │  - isSerializationError(err): boolean       │
   │  - emitReservationConfirmed(id)             │
   │  - emitReservationCancelled(id)             │
   └────────────────┬────────────────────────────┘
                    │ uses
                    ▼
   ┌─────────────────────────────────────────────┐
   │          PrismaService                      │
   │  + $transaction(fn, options)                │
   │  + $queryRaw                                │
   │  + reservation, court, user, …              │
   └─────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────┐
   │           CourtsService                     │
   │  + list(includeInactive)                    │
   │  + findByIdOrThrow(id)                      │
   │  + create(dto)                              │
   │  + update(id, dto)                          │
   │  + softDelete(id)                           │
   │  + hardDelete(id)                           │
   └─────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────┐
   │   RecurringReservationsService              │
   │  + list(courtId?)                           │
   │  + create(dto)                              │
   │  + softDelete(id)                           │
   └─────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────┐
   │           StatsService                      │
   │  + getStats(days): StatsResponse            │
   └─────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────┐
   │          ReminderService                    │
   │  @Cron(EVERY_HOUR)                          │
   │  + handleHourlyTick()                       │
   │  + runOnce(): number                        │
   └─────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────┐
   │           AuditService                      │
   │  + record(rec)                              │
   │  + list({ limit, skip, resource })          │
   └─────────────────────────────────────────────┘
```

### 4.3.1 Relaciones de dependencia

- `AuthService` depende de `UsersService` y `NotificationsService`.
- `ReservationsService` depende de `PrismaService` y publica eventos
  consumidos por `ReservationListener → NotificationsService`.
- `ReminderService` depende de `PrismaService` y `NotificationsService`.
- `AuditService` es consumido transversalmente por el `AuditInterceptor`,
  que se aplica globalmente a todas las requests de mutación.

---

## 4.4 Subsistemas

El backend está organizado en módulos NestJS, cada uno representando
un subsistema cohesivo:

### 4.4.1 Subsistema de Autenticación (`AuthModule`)

Encapsula el registro de usuarios, login, refresh de tokens,
verificación de email, reseteo de contraseña y emisión de JWT. Expone
los endpoints `/api/auth/*` y depende de los módulos `UsersModule` y
`NotificationsModule`.

### 4.4.2 Subsistema de Usuarios (`UsersModule`)

Gestiona el ciclo de vida de las cuentas (CRUD básico, verificación,
cambio de contraseña, edición de perfil). Expone `/api/users/me`.

### 4.4.3 Subsistema de Canchas (`CourtsModule`)

CRUD de canchas con soft delete y hard delete. Expone `/api/courts/*`.

### 4.4.4 Subsistema de Reservas (`ReservationsModule`)

El subsistema más crítico. Contiene:

- `ReservationsService` con la lógica transaccional de creación.
- `ReminderService` con el cron job de recordatorios.
- `StatsService` con el cálculo de métricas para el dashboard.

Expone `/api/reservations/*` y depende de `CourtsModule` y
`NotificationsModule`.

### 4.4.5 Subsistema de Turnos Fijos (`RecurringReservationsModule`)

Bloqueos recurrentes semanales. Expone `/api/recurring-reservations/*`.

### 4.4.6 Subsistema de Notificaciones (`NotificationsModule`)

Despacha emails según el canal correspondiente. Implementa el patrón
Strategy con `INotificationChannel` y escucha los eventos de
`reservation.confirmed` / `reservation.cancelled`.

### 4.4.7 Subsistema de Información del Club (`ClubInfoModule`)

Singleton con la información institucional pública (dirección, mapa,
horarios, servicios). Expone `/api/club-info`.

### 4.4.8 Subsistema de Auditoría (`AuditModule`)

Registro inmutable de acciones administrativas. Consta de
`AuditService` (escritura/lectura), `AuditInterceptor` (registro
automático) y `AuditController` (consulta paginada).

### 4.4.9 Subsistema de Observabilidad (`HealthModule`)

Endpoints de liveness y readiness para load balancers y monitores.

---

## 4.5 Reglas de negocio centralizadas

Las reglas de negocio del dominio están codificadas en el archivo
`booking-policy.ts`, importado allí donde se aplican. Centralizar las
reglas en una sola ubicación cumple con el principio DRY y facilita
auditarlas o modificarlas:

```typescript
export const BOOKING_POLICY = {
  /** Anticipación máxima permitida para reservar (días). */
  MAX_DAYS_AHEAD: 30,

  /** Anticipación mínima al horario de inicio (horas). */
  MIN_HOURS_BEFORE_START_TO_BOOK: 2,

  /** Plazo mínimo antes del inicio para cancelar (horas). */
  MIN_HOURS_BEFORE_START_TO_CANCEL: 4,

  /** Cantidad máxima de reservas FUTURAS activas por usuario. */
  MAX_ACTIVE_RESERVATIONS_PER_USER: 3,
} as const;
```

### 4.5.1 Aplicación de las reglas

Las reglas son aplicadas en el `ReservationsService`:

- **Al crear una reserva**: anticipación mínima/máxima, cupo del
  usuario (verificado dentro de la transacción).
- **Al cancelar una reserva**: plazo de cancelación.

El rol `ADMIN` está **exento** de todas las reglas: puede reservar
hoy a último minuto, cancelar a la hora del turno y crear más de tres
reservas activas. Esta exención es consciente y documentada: el
administrador necesita flexibilidad para resolver situaciones operativas
(bloqueos por mantenimiento, reservas a nombre del complejo, etc.).

### 4.5.2 Configurabilidad

Los valores numéricos están definidos como constantes inmutables
(`as const`). Si en el futuro la operación del complejo requiere
parámetros distintos, la migración a variables de entorno es de una
línea: importar `ConfigService` y consultar la variable correspondiente.

---

## 4.6 Decisiones de diseño justificadas

A continuación se documentan las decisiones técnicas más significativas,
con la alternativa considerada y la razón de la elección.

### DD-01 — Monorepo en lugar de dos repositorios

**Decisión.** Backend y frontend conviven en un único repositorio bajo
`apps/api` y `apps/web`.

**Alternativa.** Dos repositorios Git independientes.

**Justificación.** Un monorepo facilita la coordinación de cambios que
afectan ambos lados (por ejemplo, agregar un campo nuevo a un DTO del
backend e inmediatamente consumirlo en el frontend). Para un trabajo
académico de alcance acotado, la complejidad adicional de scripts
inter-repo no se justifica.

### DD-02 — Soft delete vía `isActive`

**Decisión.** Las canchas y turnos fijos se "eliminan" cambiando
`isActive` a `false` en lugar de borrarlos físicamente.

**Alternativa.** Borrado físico con `DELETE FROM courts WHERE id = ?`.

**Justificación.** El historial operativo es valioso (reportes de
facturación, auditoría) y se perdería con borrado físico, dado el
`onDelete: Restrict` que protege las reservas. Para el caso excepcional
en que el administrador necesite eliminar definitivamente, el sistema
ofrece un flujo controlado en dos pasos (suspender, luego eliminar).

### DD-03 — Transacción Serializable + SELECT FOR UPDATE para reservas

**Decisión.** La creación de reservas se ejecuta en una transacción
de aislamiento `Serializable` que incluye una consulta
`SELECT ... FOR UPDATE` sobre las reservas potencialmente solapadas.

**Alternativa A.** `EXCLUDE USING gist` a nivel de base, con extensión
`btree_gist`. Más estricto pero requiere extensión externa.

**Alternativa B.** Lock optimista con verificación post-insert.
Conceptualmente similar pero menos legible y dependiente del orden de
las operaciones.

**Justificación.** La combinación adoptada provee garantía equivalente
al EXCLUDE constraint sin requerir extensiones, es documentable en
términos teóricos (SSI + bloqueos pesimistas), y permite manejar el
reintento ante `40001` de manera explícita y transparente para el
cliente. Este es el aporte técnico central del trabajo.

### DD-04 — JWT dual (access + refresh) en lugar de session cookies

**Decisión.** El sistema emite dos tokens JWT con secretos distintos
y vidas útiles distintas.

**Alternativa.** Session cookies HttpOnly con sesión persistida en
Redis o en la base.

**Justificación.** JWT permite que cualquier instancia del backend
valide un token sin consultar una fuente central, simplificando la
escalabilidad horizontal. El esquema dual mitiga el riesgo de robo del
access token con vida corta. La alternativa de sesiones requiere
infraestructura adicional (Redis) y es más compleja de implementar.

**Trade-off conocido.** Los JWT no son revocables individualmente —
para anular una sesión activa antes de su expiración natural, sería
necesario incorporar una lista de tokens revocados, decisión que se
deja como trabajo futuro.

### DD-05 — Storage de tokens en cookies del cliente (no HttpOnly)

**Decisión.** El access token y refresh token se persisten en cookies
del lado del cliente, accesibles desde JavaScript.

**Alternativa.** Cookies `HttpOnly`, inmunes a XSS pero requieren un
endpoint proxy en Next.js para inyectar el header `Authorization`.

**Justificación.** Para el alcance académico, la solución elegida es
más simple de implementar y depurar. Se documenta como **trabajo
futuro** la migración a HttpOnly + proxy para producción real.

### DD-06 — Eventos de dominio para notificaciones

**Decisión.** El subsistema de reservas publica eventos
(`reservation.confirmed`, `reservation.cancelled`) que son consumidos
por un listener que delega al `NotificationsService`. Las emisiones
ocurren **después** del commit de la transacción.

**Alternativa.** Llamada directa al `NotificationsService` desde
`ReservationsService`.

**Justificación.** Los eventos desacoplan productores de consumidores
(principio Observer). Mañana, agregar auditoría adicional o
integraciones externas a la confirmación de una reserva requiere
sumar un listener nuevo, sin tocar el productor. La emisión post-commit
sigue un patrón "outbox simplificado": evita enviar notificaciones por
reservas que terminan en rollback.

### DD-07 — Cron horario con flag de idempotencia

**Decisión.** Los recordatorios se envían mediante un cron que corre
cada hora en punto, buscando reservas con `reminderSent = false` que
arrancan en menos de 25 horas, y marcando el flag al enviar.

**Alternativa.** Sistema de cola persistida (BullMQ + Redis) con
recordatorios programados individualmente al momento de crear la
reserva.

**Justificación.** El cron horario es suficiente para la granularidad
requerida (un recordatorio 24 hs antes), no introduce dependencias
adicionales (Redis) y es trivial de razonar. La idempotencia se
garantiza por el flag, no por el job scheduler. Como **trabajo futuro**
se documenta la migración a una cola para soportar volúmenes mayores y
recordatorios más finos.

### DD-08 — Tipos generados por Prisma compartidos al frontend

**Decisión.** El frontend redefine los tipos relevantes en
`lib/types.ts`, sin compartir el cliente generado de Prisma.

**Alternativa.** Paquete `shared` con tipos comunes consumido por
ambos workspaces.

**Justificación.** Mantener tipos duplicados (con docs explícitas) es
más simple para un trabajo académico que configurar un paquete
compartido con su propio build. Los tipos del frontend son DTOs (datos
serializados), no entidades de dominio — diferencian intencionalmente
"el contrato HTTP" del "modelo de base de datos".

### DD-09 — UI con dark mode y tipografía Geist

**Decisión.** La interfaz utiliza Geist Sans + Geist Mono como
tipografía principal y soporta modo claro y oscuro con persistencia.

**Alternativa.** Inter o System UI; un único modo.

**Justificación.** Geist (Vercel) es una fuente moderna y sobria,
adecuada para una aplicación que aspira a sentirse "premium". El modo
oscuro es un estándar de UX contemporánea y especialmente útil para
operadores que pasan muchas horas en el sistema (administradores del
complejo).

---
