# Anexo C — Referencia de la API

Este anexo lista todos los endpoints expuestos por el backend Pádel
Turnos. La documentación interactiva (con formularios para probar cada
endpoint) está disponible en `http://localhost:3001/api/docs` mediante
Swagger UI.

**Base URL**: `http://localhost:3001/api`

**Autenticación**: Todos los endpoints requieren el header
`Authorization: Bearer <accessToken>` excepto los marcados con
`@Public`.

**Roles**: Los endpoints marcados con `(ADMIN)` requieren un usuario
con rol administrador.

---

## C.1 Subsistema de Autenticación (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público | Crear nueva cuenta. Envía email de verificación. |
| GET | `/auth/verify-email?token=XXX` | Público | Activar cuenta con el token recibido por email. |
| POST | `/auth/login` | Público | Iniciar sesión. Devuelve `{ accessToken, refreshToken, user }`. |
| POST | `/auth/refresh` | Refresh token en body | Renovar el access token. |
| POST | `/auth/forgot-password` | Público | Solicitar email de reseteo de contraseña. |
| POST | `/auth/reset-password` | Público | Aplicar nueva contraseña con token de reseteo. |
| GET | `/auth/me` | Bearer | Datos del usuario autenticado (payload del token). |

### Ejemplo de payload de `/auth/register`

```json
{
  "name": "Juan Pérez",
  "email": "juan.perez@example.com",
  "password": "Password123!",
  "phone": "+543482111111"
}
```

### Ejemplo de respuesta de `/auth/login`

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "role": "USER",
    "isEmailVerified": true,
    "createdAt": "2026-05-21T...",
    "updatedAt": "2026-05-21T..."
  }
}
```

---

## C.2 Subsistema de Usuarios (`/api/users`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/users/me` | Bearer | Perfil completo del usuario autenticado. |
| PATCH | `/users/me` | Bearer | Editar nombre y/o teléfono. |
| POST | `/users/me/change-password` | Bearer | Cambiar contraseña validando la actual. |

---

## C.3 Subsistema de Canchas (`/api/courts`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/courts` | Público | Listar canchas activas. Query `?includeInactive=true` para incluir las suspendidas. |
| GET | `/courts/:id` | Público | Obtener una cancha por id. |
| POST | `/courts` | Bearer (ADMIN) | Crear una cancha. |
| PATCH | `/courts/:id` | Bearer (ADMIN) | Actualizar parcialmente una cancha. |
| DELETE | `/courts/:id` | Bearer (ADMIN) | Suspender (soft delete). |
| DELETE | `/courts/:id/permanent` | Bearer (ADMIN) | Eliminar definitivamente (con sus reservas históricas, transacción atómica). |

---

## C.4 Subsistema de Reservas (`/api/reservations`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/reservations/availability?courtId=X&date=YYYY-MM-DD` | Público | Slots disponibles del día para una cancha. |
| GET | `/reservations/me` | Bearer | Reservas del usuario autenticado. |
| GET | `/reservations?date=&courtId=` | Bearer (ADMIN) | Listado filtrado. |
| POST | `/reservations` | Bearer (rate-limited 10/min) | **Crear reserva (endpoint crítico)**. |
| PATCH | `/reservations/:id/cancel` | Bearer | Cancelar reserva (dueño o ADMIN). |
| PATCH | `/reservations/:id/status` | Bearer (ADMIN) | Cambiar estado. |
| PATCH | `/reservations/:id/reschedule` | Bearer (ADMIN) | Reprogramar a otro horario. |
| GET | `/reservations/stats?days=7\|30\|90` | Bearer (ADMIN) | Métricas agregadas. |
| POST | `/reservations/run-reminders` | Bearer (ADMIN) | Disparar manualmente los recordatorios (útil para demos). |

### Ejemplo de payload de `/reservations` (POST)

```json
{
  "courtId": "uuid",
  "startTime": "2026-05-25T16:00:00.000Z",
  "endTime": "2026-05-25T17:30:00.000Z",
  "notes": "Partido amistoso"
}
```

### Respuestas posibles

- `201 Created` con el objeto de la reserva creada.
- `400 Bad Request` por violación de regla de negocio (anticipación,
  cupo, fecha pasada).
- `404 Not Found` si la cancha no existe.
- `409 Conflict` si el horario está ocupado (por otra reserva o por
  un turno fijo recurrente).

---

## C.5 Subsistema de Turnos Fijos (`/api/recurring-reservations`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/recurring-reservations?courtId=X` | Bearer | Listar turnos fijos activos. |
| POST | `/recurring-reservations` | Bearer (ADMIN) | Crear bloqueo recurrente semanal. |
| DELETE | `/recurring-reservations/:id` | Bearer (ADMIN) | Liberar el bloqueo (soft delete). |

### Ejemplo de payload de POST

```json
{
  "courtId": "uuid",
  "dayOfWeek": 1,
  "startMinute": 780,
  "endMinute": 870,
  "notes": "Escuela de pádel"
}
```

`dayOfWeek`: 0=Domingo, 1=Lunes, ..., 6=Sábado.
`startMinute` / `endMinute`: minutos desde medianoche (780 = 13:00,
870 = 14:30).

---

## C.6 Subsistema de Información del Club (`/api/club-info`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/club-info` | Público | Información institucional pública. |
| PATCH | `/club-info` | Bearer (ADMIN) | Actualizar información. |

### Ejemplo de respuesta

```json
{
  "id": "default",
  "address": "Av. San Martín 1234, Reconquista, Santa Fe",
  "mapEmbedUrl": "https://www.google.com/maps/embed?...",
  "weekdayHours": "13:00 a 23:00",
  "weekendHours": "13:00 a 23:00",
  "holidayHours": "13:00 a 23:00",
  "services": ["Wi-Fi", "Vestuario", "Bar / Restaurante"],
  "createdAt": "2026-05-20T...",
  "updatedAt": "2026-05-21T..."
}
```

---

## C.7 Subsistema de Auditoría (`/api/audit-logs`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/audit-logs?limit=N&skip=M&resource=R` | Bearer (ADMIN) | Listar acciones administrativas con paginación. |

---

## C.8 Subsistema de Observabilidad (`/api/health`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Liveness probe — el proceso responde. |
| GET | `/health/readiness` | Público | Readiness probe — verifica DB y memoria. |

### Respuesta de `/health/readiness`

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
  },
  "error": {},
  "details": { ... }
}
```

Si alguna verificación falla, la respuesta es **503 Service
Unavailable** con el detalle de las fallas.

---

## C.9 Formato de errores

Todos los errores siguen una respuesta consistente normalizada por el
`GlobalExceptionFilter`:

```json
{
  "statusCode": 409,
  "message": "El horario solicitado ya está reservado para esta cancha.",
  "error": "Conflict",
  "timestamp": "2026-05-21T22:15:00.000Z",
  "path": "/api/reservations"
}
```

| Status | Significado |
|---|---|
| 400 | Validación de DTO falló, o violación de regla de negocio |
| 401 | Falta o es inválido el token de autenticación |
| 403 | El rol no tiene permisos para esta operación |
| 404 | El recurso no existe |
| 409 | Conflicto de estado (ej.: horario ocupado) |
| 429 | Límite de tasa excedido |
| 500 | Error interno no manejado |

---

## C.10 Headers y consideraciones de seguridad

- `Authorization: Bearer <token>` — token JWT de access.
- `Content-Type: application/json` — para requests con body.
- Las respuestas incluyen las cabeceras de seguridad estándar
  inyectadas por `helmet` (X-Content-Type-Options, X-Frame-Options,
  Strict-Transport-Security en HTTPS, etcétera).
- CORS está restringido al dominio del frontend declarado por
  `FRONTEND_URL` en el entorno.

---
