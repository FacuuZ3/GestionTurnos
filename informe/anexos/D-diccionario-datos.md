# Anexo D — Diccionario de Datos

Este anexo formaliza todas las entidades persistidas del sistema con la
definición completa de sus atributos, tipos, restricciones, índices y
relaciones. Constituye la referencia normativa del modelo de datos.

## D.1 Convenciones

- **PK**: clave primaria.
- **FK**: clave foránea.
- **`?`** al final de un nombre: campo opcional (nullable en BD).
- **Tipos**: se utiliza la nomenclatura PostgreSQL/Prisma.
- **onDelete**:
  - `Restrict`: rechaza el borrado del padre si hay hijos.
  - `Cascade`: borra los hijos automáticamente al borrar el padre.

---

## D.2 Entidad `User` (tabla `users`)

Representa las cuentas de los usuarios del sistema, tanto clientes
como administradores.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `default(uuid())` | Identificador único universal |
| `name` | VARCHAR(120) | NOT NULL | Nombre y apellido del usuario |
| `email` | VARCHAR(160) | NOT NULL, UNIQUE | Email único, sirve como identificador funcional |
| `password` | VARCHAR(255) | NOT NULL | Hash bcrypt (10 rondas) de la contraseña |
| `phone` | VARCHAR(30) | NULL | Teléfono de contacto, opcional |
| `role` | ENUM | NOT NULL, `default('USER')` | Rol del usuario (USER \| ADMIN) |
| `isEmailVerified` | BOOLEAN | NOT NULL, `default(false)` | Cuenta verificada por email |
| `emailVerifyToken` | VARCHAR(120) | NULL, UNIQUE | Token de verificación de email |
| `passwordResetToken` | VARCHAR(120) | NULL, UNIQUE | Token de reseteo de contraseña |
| `passwordResetTokenExpiresAt` | TIMESTAMPTZ | NULL | Vencimiento del token de reseteo |
| `createdAt` | TIMESTAMPTZ | NOT NULL, `default(now())` | Marca temporal de alta |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, `@updatedAt` | Marca temporal de última modificación |

**Índices**:
- `(role)` — filtros administrativos por rol.

**Relaciones**:
- 1 → N con `Reservation` (campo `reservations`).

---

## D.3 Entidad `Court` (tabla `courts`)

Representa las canchas del complejo deportivo.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `default(uuid())` | Identificador único |
| `name` | VARCHAR(80) | NOT NULL | Nombre comercial (ej.: "Cancha Norte") |
| `sportType` | ENUM | NOT NULL, `default('PADEL')` | Tipo de deporte (PADEL, TENNIS, FUTBOL) |
| `description` | VARCHAR(500) | NULL | Descripción libre (superficie, iluminación...) |
| `isActive` | BOOLEAN | NOT NULL, `default(true)` | Estado de habilitación (soft delete) |
| `pricePerHour` | DECIMAL(10, 2) | NOT NULL | Precio por hora en pesos argentinos |
| `createdAt` | TIMESTAMPTZ | NOT NULL, `default(now())` | Marca temporal de alta |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, `@updatedAt` | Marca temporal de última modificación |

**Índices**:
- `(isActive)` — listados filtrados por estado.

**Relaciones**:
- 1 → N con `Reservation`.
- 1 → N con `RecurringReservation` (con cascade al borrar).

---

## D.4 Entidad `Reservation` (tabla `reservations`)

Representa los turnos reservados por los clientes. Entidad central del
dominio.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `default(uuid())` | Identificador único |
| `userId` | UUID | FK → `User.id`, NOT NULL, onDelete Restrict | Titular de la reserva |
| `courtId` | UUID | FK → `Court.id`, NOT NULL, onDelete Restrict | Cancha reservada |
| `startTime` | TIMESTAMPTZ | NOT NULL | Inicio del turno (con offset de zona horaria) |
| `endTime` | TIMESTAMPTZ | NOT NULL | Fin del turno |
| `status` | ENUM | NOT NULL, `default('CONFIRMED')` | Estado (PENDING, CONFIRMED, CANCELLED) |
| `notes` | VARCHAR(500) | NULL | Observaciones libres |
| `reminderSent` | BOOLEAN | NOT NULL, `default(false)` | Flag de idempotencia para el cron de recordatorios |
| `rescheduledAt` | TIMESTAMPTZ | NULL | Marca temporal de la última reprogramación |
| `createdAt` | TIMESTAMPTZ | NOT NULL, `default(now())` | Marca temporal de creación |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, `@updatedAt` | Marca temporal de última modificación |

**Índices**:
- `(courtId, startTime, endTime)` — consultas de solapamiento
  optimizadas (es la consulta más frecuente del sistema).
- `(userId, startTime)` — listado de reservas por usuario.
- `(status)` — filtros por estado.

**Restricciones de integridad** (aplicadas en la capa de servicio
mediante transacción `Serializable`):
- `startTime < endTime`.
- No puede existir más de una reserva no cancelada para la misma
  cancha en rangos horarios solapados (`startTime < otherEnd AND
  endTime > otherStart`).

---

## D.5 Entidad `RecurringReservation` (tabla `recurring_reservations`)

Representa los bloqueos recurrentes semanales (turnos fijos).

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `default(uuid())` | Identificador único |
| `courtId` | UUID | FK → `Court.id`, NOT NULL, onDelete Cascade | Cancha bloqueada |
| `dayOfWeek` | SMALLINT | NOT NULL, 0..6 | Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) |
| `startMinute` | SMALLINT | NOT NULL, 0..1439 | Minutos desde medianoche del inicio del bloqueo |
| `endMinute` | SMALLINT | NOT NULL, 1..1440 | Minutos desde medianoche del fin del bloqueo |
| `notes` | VARCHAR(500) | NULL | Observación libre (ej.: "Escuela de pádel") |
| `isActive` | BOOLEAN | NOT NULL, `default(true)` | Estado del bloqueo (soft delete) |
| `createdAt` | TIMESTAMPTZ | NOT NULL, `default(now())` | Marca temporal de creación |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, `@updatedAt` | Marca temporal de última modificación |

**Índices**:
- `(courtId, dayOfWeek, isActive)` — consulta de bloqueos vigentes
  para una cancha y día.

**Convención de minutos desde medianoche**:
- 780 = 13:00
- 870 = 14:30
- 1320 = 22:00

---

## D.6 Entidad `ClubInfo` (tabla `club_info`)

Singleton con la información institucional pública del complejo.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | TEXT | PK, valor fijo `"default"` | Identificador del singleton |
| `address` | VARCHAR(255) | NOT NULL | Dirección postal del complejo |
| `mapEmbedUrl` | TEXT | NULL | URL del iframe de Google Maps |
| `weekdayHours` | VARCHAR(80) | NOT NULL | Horario de lunes a viernes |
| `weekendHours` | VARCHAR(80) | NOT NULL | Horario de sábados y domingos |
| `holidayHours` | VARCHAR(80) | NOT NULL | Horario de feriados |
| `services` | TEXT[] | NOT NULL | Array de servicios ofrecidos (Wi-Fi, Vestuario, etc.) |
| `createdAt` | TIMESTAMPTZ | NOT NULL, `default(now())` | Marca temporal de creación |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, `@updatedAt` | Marca temporal de última modificación |

**Particularidad**: el modelo se implementa como singleton lógico:
existe siempre una y sólo una fila con `id = "default"`. El servicio
asociado realiza un *upsert* al primer acceso si la fila no existe.

---

## D.7 Entidad `AuditLog` (tabla `audit_logs`)

Registro inmutable de acciones administrativas sobre el sistema.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, `default(uuid())` | Identificador único |
| `actorId` | UUID | NOT NULL | Identificador del administrador que ejecutó la acción |
| `actorEmail` | VARCHAR(160) | NOT NULL | Email del administrador (denormalizado para histórico) |
| `action` | VARCHAR(40) | NOT NULL | Verbo HTTP (POST, PATCH, DELETE) |
| `resource` | VARCHAR(40) | NOT NULL | Recurso afectado (Court, Reservation, ClubInfo, ...) |
| `resourceId` | VARCHAR(64) | NULL | Identificador del recurso afectado, cuando aplica |
| `metadata` | JSONB | NULL | Datos adicionales (URL completa, body sanitizado) |
| `ip` | VARCHAR(45) | NULL | IP del cliente (IPv4 o IPv6) |
| `createdAt` | TIMESTAMPTZ | NOT NULL, `default(now())` | Marca temporal del registro |

**Índices**:
- `(actorId, createdAt)` — acciones por usuario en orden cronológico.
- `(resource, resourceId)` — historial de un recurso específico.
- `(createdAt)` — listado general ordenado por fecha.

**Propiedades**: las filas de esta tabla **nunca** se actualizan ni
borran desde el código de aplicación. El interceptor
`AuditInterceptor` sólo inserta. Si el insert falla, el error se
loguea pero no propaga (la falla del audit no debe romper la operación
principal).

---

## D.8 Enumeraciones

### `Role`

| Valor | Descripción |
|---|---|
| `USER` | Cliente del complejo deportivo |
| `ADMIN` | Personal administrativo del complejo |

### `SportType`

| Valor | Descripción |
|---|---|
| `PADEL` | Cancha de pádel (caso principal del sistema) |
| `TENNIS` | Tenis (preparado para extensibilidad futura) |
| `FUTBOL` | Fútbol (preparado para extensibilidad futura) |

### `ReservationStatus`

| Valor | Descripción |
|---|---|
| `PENDING` | Reserva creada pendiente de confirmación |
| `CONFIRMED` | Reserva confirmada (estado por defecto en alta automática) |
| `CANCELLED` | Reserva cancelada (no participa en cálculos de disponibilidad) |

---

## D.9 Notas de modelado

- **UUID v4** como PK universal evita la enumeración secuencial de
  recursos desde el cliente.
- **TIMESTAMPTZ** en lugar de TIMESTAMP preserva la zona horaria,
  evitando ambigüedades entre clientes y servidores.
- **DECIMAL(10, 2)** en `pricePerHour` previene errores de coma
  flotante en cálculos monetarios.
- **Soft delete** mediante `isActive` (Court y RecurringReservation)
  preserva el historial. El hard delete está disponible sólo para
  canchas mediante un flujo controlado.
- **Arrays nativos** (`text[]` en PostgreSQL) para `ClubInfo.services`
  evitan la sobrecarga de una tabla relacional cuando la colección no
  tiene atributos adicionales.

---
