# Capítulo 3 — Análisis del Sistema

Este capítulo identifica los actores que interactúan con el sistema, enumera
los requerimientos funcionales y no funcionales, y modela los casos de uso
principales mediante narrativa formal con flujos principal y alternativos.

## 3.1 Identificación de actores

Un **actor** representa un rol que interactúa con el sistema desde el
exterior. La identificación temprana de los actores delimita el alcance
de la aplicación y guía el diseño de la autorización.

El sistema reconoce los siguientes actores:

### 3.1.1 Actores humanos

#### Cliente (rol `USER`)

Persona que utiliza el sistema para consultar disponibilidad de canchas y
reservar turnos. Características relevantes:

- Crea su cuenta de manera autónoma.
- Posee una sola cuenta asociada a su correo electrónico.
- Está sujeto a las reglas de negocio del dominio (anticipación,
  cancelación, cupo).
- Sólo puede ver y modificar sus propias reservas.

#### Administrador (rol `ADMIN`)

Personal del complejo deportivo encargado de la operación cotidiana.
Características relevantes:

- Su cuenta se crea por medio de un *seed* inicial (no por
  auto-registro), dado que el rol implica privilegios elevados.
- Está exento de las reglas de negocio que sí aplican al cliente.
- Puede operar sobre cualquier reserva del sistema, no sólo las propias.
- Es el único actor con capacidad de modificar canchas, turnos fijos,
  información institucional y de consultar el registro de auditoría.

#### Visitante anónimo

Persona que accede al sitio sin estar autenticada. Características:

- Puede consultar la información pública del complejo (canchas
  disponibles, dirección, horarios, servicios).
- Puede consultar la disponibilidad de slots para una cancha y fecha
  específica, pero no puede reservar.
- Debe registrarse y verificar su email para convertirse en un
  Cliente.

### 3.1.2 Actores no humanos (sistemas externos)

#### Servidor SMTP (proveedor de email)

Sistema externo que recibe los mensajes generados por el subsistema de
notificaciones del backend y los entrega al destinatario final. En
desarrollo, el sistema degrada gracefully imprimiendo los mensajes en
consola si SMTP no está disponible.

#### Cron Scheduler interno

Aunque no es estrictamente un actor externo, conviene modelarlo como un
disparador autónomo: el módulo `@nestjs/schedule` invoca el método
`ReminderService.handleHourlyTick` cada hora en punto, sin intervención
humana. Es el equivalente del *Scheduler* en notación UML.

### 3.1.3 Diagrama de actores

A nivel conceptual, las relaciones entre actores y sistema pueden
representarse como sigue:

```
                ┌─────────────────────────────┐
                │     Sistema Pádel Turnos    │
                │                             │
   Visitante  ──┤  Consultar canchas          │
                │  Consultar disponibilidad   │
                │  Registrarse                │
                │  Verificar email            │
                │                             │
   Cliente    ──┤  Iniciar sesión             │
                │  Reservar turno             │
                │  Cancelar turno propio      │
                │  Editar perfil              │
                │  Resetear contraseña        │
                │                             │
   Admin      ──┤  Gestionar canchas          │
                │  Gestionar turnos fijos     │──── Servidor SMTP
                │  Reprogramar / cancelar     │
                │  Editar info del club       │
                │  Ver estadísticas           │
                │  Ver auditoría              │
                │                             │
   Cron       ──┤  Enviar recordatorios 24h   │
                └─────────────────────────────┘
```

---

## 3.2 Requerimientos funcionales

Los requerimientos funcionales (RF) describen *qué* debe hacer el sistema.
Se numeran y agrupan por subsistema para facilitar el seguimiento de su
implementación.

### 3.2.1 Subsistema de Autenticación

| ID | Descripción |
|---|---|
| RF-01 | El sistema debe permitir a un visitante registrar una cuenta proveyendo nombre, email, contraseña y teléfono (opcional). |
| RF-02 | El sistema debe enviar un correo de verificación con un token único al alta de cada cuenta. |
| RF-03 | El sistema debe permitir activar la cuenta consumiendo el token de verificación; el token debe poder usarse una única vez. |
| RF-04 | El sistema debe permitir iniciar sesión a usuarios con cuenta verificada, devolviendo un par de tokens JWT (access + refresh). |
| RF-05 | El sistema debe permitir renovar el access token sin requerir re-ingreso de credenciales, presentando un refresh token válido. |
| RF-06 | El sistema debe permitir solicitar un correo de reseteo de contraseña indicando el email; la respuesta debe ser idéntica exista o no la cuenta. |
| RF-07 | El sistema debe permitir definir una nueva contraseña consumiendo un token de reseteo no expirado. |
| RF-08 | El sistema debe permitir cerrar sesión, eliminando las credenciales locales del cliente. |

### 3.2.2 Subsistema de Perfil

| ID | Descripción |
|---|---|
| RF-09 | El sistema debe permitir al usuario autenticado consultar su perfil. |
| RF-10 | El sistema debe permitir al usuario autenticado editar su nombre y teléfono; el email no es editable. |
| RF-11 | El sistema debe permitir al usuario autenticado cambiar su contraseña, validando previamente la contraseña actual. |

### 3.2.3 Subsistema de Canchas

| ID | Descripción |
|---|---|
| RF-12 | El sistema debe listar públicamente las canchas activas del complejo. |
| RF-13 | El sistema debe permitir al administrador crear una nueva cancha indicando nombre, tipo de deporte, precio por hora, descripción opcional y estado de habilitación. |
| RF-14 | El sistema debe permitir al administrador editar los datos de una cancha existente. |
| RF-15 | El sistema debe permitir al administrador suspender una cancha (soft delete), ocultándola a los clientes pero preservando su historial. |
| RF-16 | El sistema debe permitir al administrador eliminar definitivamente una cancha previamente suspendida, junto con su historial de reservas, dentro de una transacción atómica. |

### 3.2.4 Subsistema de Reservas

| ID | Descripción |
|---|---|
| RF-17 | El sistema debe permitir consultar la disponibilidad de slots de 90 minutos para una cancha en una fecha dada, marcando cada slot como disponible u ocupado. |
| RF-18 | El sistema debe permitir al usuario autenticado crear una reserva indicando cancha, hora de inicio y hora de fin. |
| RF-19 | El sistema debe garantizar la unicidad de la reserva: no podrá existir más de una reserva no cancelada para la misma cancha en rangos horarios que se solapen. |
| RF-20 | El sistema debe permitir al usuario cancelar sus propias reservas dentro del plazo definido por la política de cancelación. |
| RF-21 | El sistema debe permitir al administrador reprogramar una reserva existente a una nueva ventana horaria, registrando la marca temporal de la reprogramación. |
| RF-22 | El sistema debe permitir al administrador cambiar el estado de cualquier reserva (PENDING / CONFIRMED / CANCELLED). |
| RF-23 | El sistema debe permitir al administrador listar todas las reservas del día agrupadas por estado y por cancha. |
| RF-24 | El sistema debe permitir al usuario autenticado consultar el historial completo de sus reservas, ordenado por fecha descendente. |

### 3.2.5 Subsistema de Turnos Fijos

| ID | Descripción |
|---|---|
| RF-25 | El sistema debe permitir al administrador crear bloqueos recurrentes semanales especificando cancha, día de la semana y rango horario. |
| RF-26 | El sistema debe respetar los bloqueos recurrentes en el cálculo de disponibilidad: los slots solapados deben marcarse como ocupados. |
| RF-27 | El sistema debe rechazar la creación de reservas puntuales que se solapen con un bloqueo recurrente activo. |
| RF-28 | El sistema debe permitir al administrador liberar (suspender) un bloqueo recurrente vigente. |

### 3.2.6 Subsistema de Notificaciones

| ID | Descripción |
|---|---|
| RF-29 | El sistema debe enviar un correo de confirmación al crear una reserva. |
| RF-30 | El sistema debe enviar un correo de cancelación al cancelar una reserva. |
| RF-31 | El sistema debe enviar un correo recordatorio aproximadamente 24 horas antes del inicio de cada turno confirmado. |
| RF-32 | El sistema debe garantizar el envío de un único recordatorio por reserva, aun ante reinicios o ejecuciones repetidas del job. |

### 3.2.7 Subsistema Administrativo

| ID | Descripción |
|---|---|
| RF-33 | El sistema debe permitir al administrador editar la información institucional del complejo (dirección, URL de mapa embebido, horarios, servicios). |
| RF-34 | El sistema debe ofrecer al administrador un dashboard de estadísticas con: totales por estado, facturación estimada por cancha, ocupación porcentual, top de clientes y mapa de calor día × horario. |
| RF-35 | El sistema debe permitir al administrador consultar el registro de auditoría de las acciones realizadas, con paginación. |
| RF-36 | El sistema debe registrar automáticamente toda acción de mutación (POST, PATCH, DELETE) realizada por un administrador, incluyendo actor, recurso, IP y timestamp. |

### 3.2.8 Subsistema de Observabilidad

| ID | Descripción |
|---|---|
| RF-37 | El sistema debe exponer un endpoint público de *liveness* para confirmar que el proceso responde. |
| RF-38 | El sistema debe exponer un endpoint público de *readiness* que verifique la disponibilidad de la base de datos y el uso de memoria. |

---

## 3.3 Requerimientos no funcionales

Los requerimientos no funcionales (RNF) describen *cómo* debe comportarse
el sistema en términos de calidad, no qué funciones provee.

### 3.3.1 Seguridad

| ID | Descripción |
|---|---|
| RNF-01 | Las contraseñas deben persistirse exclusivamente como hash bcrypt con 10 rondas; nunca en texto plano. |
| RNF-02 | Los access tokens deben expirar en un plazo no mayor a 30 minutos; los refresh tokens, en un plazo no mayor a 30 días. |
| RNF-03 | El endpoint de recuperación de contraseña debe responder de manera idéntica exista o no la cuenta, para mitigar enumeración de usuarios. |
| RNF-04 | El endpoint crítico de creación de reservas debe aplicar limitación de tasa (rate limiting) de no más de 10 solicitudes por minuto por IP. |
| RNF-05 | Las cabeceras HTTP de seguridad estándar (Content-Security-Policy, X-Frame-Options, etc.) deben aplicarse globalmente mediante `helmet`. |
| RNF-06 | CORS debe restringirse exclusivamente al dominio del frontend configurado por variable de entorno. |
| RNF-07 | Las contraseñas en el body de cualquier request deben ser redactadas como `[REDACTED]` en los logs de auditoría. |

### 3.3.2 Performance

| ID | Descripción |
|---|---|
| RNF-08 | La consulta de disponibilidad para una cancha y fecha debe responder en menos de 200 ms en el percentil 95 con base de datos hasta 10 000 reservas. |
| RNF-09 | El sistema debe soportar la creación concurrente de reservas: ante dos requests simultáneas para el mismo slot, una debe persistirse y la otra responder `409 Conflict`, sin bloqueos colgados. |
| RNF-10 | Los índices compuestos sobre `Reservation(courtId, startTime, endTime)` deben utilizarse para las consultas de solapamiento. |

### 3.3.3 Disponibilidad y resiliencia

| ID | Descripción |
|---|---|
| RNF-11 | El sistema debe poder reiniciarse sin perder reservas existentes (persistencia en disco vía volumen de Docker). |
| RNF-12 | Si el subsistema de notificaciones falla (SMTP caído), la operación principal (crear reserva) no debe abortarse. |
| RNF-13 | El job de recordatorios debe ser idempotente: una eventual ejecución duplicada no debe enviar dos correos por la misma reserva. |

### 3.3.4 Mantenibilidad

| ID | Descripción |
|---|---|
| RNF-14 | El código fuente debe estar bajo control de versiones Git, con commits atómicos y mensajes descriptivos. |
| RNF-15 | El backend y el frontend deben utilizar TypeScript en modo estricto (`strict: true`). |
| RNF-16 | Las dependencias de terceros deben declararse en `package.json` con versiones mínimas explícitas. |
| RNF-17 | El proyecto debe incluir documentación inline en español que vincule cada bloque relevante con la sección correspondiente del presente informe. |

### 3.3.5 Usabilidad

| ID | Descripción |
|---|---|
| RNF-18 | La interfaz debe ofrecer modo claro y modo oscuro, persistido en el cliente. |
| RNF-19 | La interfaz debe ser navegable en dispositivos móviles (responsive). |
| RNF-20 | Los mensajes de error visibles al usuario deben ser informativos y accionables (qué hacer para resolver), no técnicos. |
| RNF-21 | Las acciones destructivas (eliminar cancha, cancelar reserva) deben requerir confirmación explícita. |

### 3.3.6 Internacionalización y zona horaria

| ID | Descripción |
|---|---|
| RNF-22 | La interfaz debe estar íntegramente en español rioplatense. |
| RNF-23 | Las fechas deben presentarse al usuario en formato `dd/mm/yyyy` y horarios en formato `HH:mm` con zona horaria de Argentina. |
| RNF-24 | El cálculo de slots debe considerar la zona horaria local del servidor para evitar corrimientos de un día. |

---

## 3.4 Casos de uso principales

Los casos de uso describen secuencias de interacción entre los actores y el
sistema para alcanzar un objetivo. Se documentan los seis casos de uso de
mayor relevancia funcional. Para cada uno se presenta el flujo principal
("happy path") y los flujos alternativos relevantes.

### CU-01 — Registrar nueva cuenta

| Campo | Valor |
|---|---|
| Actor primario | Visitante anónimo |
| Precondiciones | Ninguna |
| Postcondición | Usuario creado en estado *no verificado*, correo de verificación enviado |

**Flujo principal**

1. El visitante accede a la página `/register`.
2. El sistema presenta el formulario con campos: nombre, email,
   contraseña y teléfono (opcional).
3. El visitante completa los campos y envía el formulario.
4. El sistema valida en cliente las reglas de formato (email válido,
   contraseña ≥ 8 caracteres).
5. El sistema valida en servidor las mismas reglas y verifica que el
   email no esté ya registrado.
6. El sistema persiste el usuario con `isEmailVerified = false` y
   genera un token único de verificación.
7. El sistema invoca al subsistema de notificaciones para enviar el
   correo de bienvenida con el enlace de verificación.
8. El sistema responde con `201 Created` y un mensaje informando al
   visitante que revise su correo.

**Flujo alternativo A — Email ya registrado**

- En el paso 5, si el email existe, el sistema responde con
  `409 Conflict` y mensaje "Ya existe una cuenta con ese email."
  El caso de uso termina.

**Flujo alternativo B — Falla del SMTP**

- En el paso 7, si el envío de correo falla y el entorno es
  desarrollo, el sistema loguea el mensaje en consola y continúa. En
  producción, propaga el error pero la cuenta queda creada.

### CU-02 — Iniciar sesión

| Campo | Valor |
|---|---|
| Actor primario | Cliente o Administrador |
| Precondiciones | Cuenta existente con email verificado |
| Postcondición | Tokens JWT emitidos y persistidos en el cliente |

**Flujo principal**

1. El usuario accede a la página `/login`.
2. El sistema presenta el formulario con campos: email y contraseña.
3. El usuario completa y envía el formulario.
4. El sistema valida las credenciales contra la base de datos
   utilizando bcrypt para comparar la contraseña.
5. El sistema verifica que la cuenta esté con email verificado.
6. El sistema emite un par de tokens JWT (access + refresh) firmados
   con secretos distintos y los devuelve junto con los datos del
   usuario.
7. El cliente persiste los tokens y los datos de usuario en cookies y
   localStorage, según corresponda.
8. El cliente redirige al dashboard correspondiente según el rol
   (`/dashboard/admin` o `/dashboard/user`).

**Flujo alternativo A — Credenciales inválidas**

- En el paso 4, si email no existe o contraseña no coincide, el
  sistema responde con `401 Unauthorized` y un mensaje genérico
  ("Credenciales inválidas") para no revelar cuál de los dos campos
  falló.

**Flujo alternativo B — Cuenta no verificada**

- En el paso 5, si la cuenta no fue verificada, el sistema responde
  con `401 Unauthorized` y mensaje específico solicitando completar la
  verificación.

### CU-03 — Reservar un turno

| Campo | Valor |
|---|---|
| Actor primario | Cliente |
| Precondiciones | Cliente autenticado; cancha activa; horario futuro |
| Postcondición | Reserva persistida con estado CONFIRMED; correo de confirmación enviado |

**Flujo principal**

1. El cliente accede a `/dashboard/user/reservar`.
2. El sistema presenta la timeline horizontal con todas las canchas
   activas del complejo, posicionando barras grises sobre los slots
   ocupados.
3. El cliente selecciona una fecha futura desde el calendario emergente.
4. El sistema consulta la disponibilidad para esa fecha y cada cancha,
   renderizando los slots libres como botones verdes interactivos.
5. El cliente hace click sobre un slot libre.
6. El sistema presenta un modal de confirmación con los datos del
   turno (cancha, fecha, horario, precio).
7. El cliente añade observaciones opcionales y confirma.
8. El sistema inicia una transacción de aislamiento `Serializable`.
9. Dentro de la transacción:
   - Verifica que el horario sea futuro y respete la anticipación
     mínima (2 hs).
   - Verifica que la cancha esté activa.
   - Ejecuta `SELECT ... FOR UPDATE` sobre las reservas
     potencialmente solapadas.
   - Verifica que no exista solapamiento con turnos fijos del día de
     la semana.
   - Verifica el cupo del usuario (máximo 3 reservas activas).
   - Persiste la reserva con estado CONFIRMED.
10. El sistema confirma la transacción.
11. El sistema publica el evento `reservation.confirmed`, cuyo listener
    dispara el envío del correo de confirmación.
12. El sistema responde con `201 Created` y los datos de la reserva.
13. El cliente recibe la confirmación, ve la nueva reserva como
    "Próxima reserva" en su panel.

**Flujo alternativo A — Conflicto de horario**

- En el paso 9, si ya existe una reserva no cancelada solapada o un
  turno fijo en ese horario, el sistema aborta la transacción y
  responde con `409 Conflict`.

**Flujo alternativo B — Conflicto de serialización (SSI)**

- Si PostgreSQL aborta la transacción con `40001` por detección de
  anomalía, el sistema reintenta automáticamente hasta tres veces con
  *backoff exponencial* (20, 40, 80 ms). Si todas las tentativas
  fallan, propaga el error al cliente.

**Flujo alternativo C — Violación de política de dominio**

- Si el horario es anterior a la anticipación mínima, posterior a la
  anticipación máxima o el cliente ya tiene tres reservas activas, el
  sistema responde con `400 Bad Request` y mensaje específico
  indicando qué regla se violó.

### CU-04 — Cancelar una reserva

| Campo | Valor |
|---|---|
| Actor primario | Cliente (también disponible para Administrador) |
| Precondiciones | Reserva existente, no cancelada |
| Postcondición | Reserva con estado CANCELLED; correo de cancelación enviado |

**Flujo principal**

1. El cliente accede a `/dashboard/user`.
2. El cliente identifica la reserva a cancelar en la sección "Próxima
   reserva" u "Otras próximas".
3. El cliente presiona el botón "Cancelar reserva".
4. El sistema verifica que la reserva pertenezca al cliente.
5. El sistema verifica que el horario de inicio sea aún al menos 4 hs
   en el futuro (política de cancelación).
6. El sistema actualiza el estado de la reserva a CANCELLED.
7. El sistema publica el evento `reservation.cancelled`, cuyo listener
   despacha el correo correspondiente.
8. El sistema responde con `200 OK` y la reserva actualizada.
9. El cliente ve la reserva removida del panel "próximas".

**Flujo alternativo A — Fuera del plazo de cancelación**

- En el paso 5, si el inicio del turno es en menos de 4 hs, el sistema
  responde con `400 Bad Request` y mensaje "No se puede cancelar
  dentro de las 4 hs previas al turno".

**Variante administrativa**

- El administrador puede cancelar cualquier reserva sin restricción de
  plazo (los pasos 4 y 5 se omiten).

### CU-05 — Crear bloqueo recurrente (turno fijo)

| Campo | Valor |
|---|---|
| Actor primario | Administrador |
| Precondiciones | Cancha activa existente |
| Postcondición | Bloqueo recurrente vigente; los slots correspondientes aparecen como ocupados en el cálculo de disponibilidad |

**Flujo principal**

1. El administrador accede a `/dashboard/admin/recurring`.
2. El administrador presiona "Nuevo turno fijo".
3. El sistema presenta un modal con: cancha, día de la semana, hora
   de inicio, hora de fin y observación opcional.
4. El administrador completa los datos y confirma.
5. El sistema valida que el rango horario sea coherente (inicio < fin)
   y que no exista un bloqueo recurrente activo solapado para la misma
   cancha y el mismo día de la semana.
6. El sistema persiste el bloqueo recurrente.
7. El sistema responde con `201 Created`.
8. El bloqueo aparece automáticamente en la lista, agrupado por día de
   la semana.

**Flujo alternativo A — Solapamiento con otro bloqueo**

- En el paso 5, si existe un bloqueo activo solapado, el sistema
  responde con `409 Conflict`.

### CU-06 — Consultar dashboard estadístico

| Campo | Valor |
|---|---|
| Actor primario | Administrador |
| Precondiciones | Existen reservas confirmadas en el rango seleccionado |
| Postcondición | El administrador visualiza métricas agregadas |

**Flujo principal**

1. El administrador accede a `/dashboard/admin/stats`.
2. El sistema consulta las reservas de los últimos 30 días (por defecto)
   y calcula:
   - Totales por estado (confirmadas, canceladas, pendientes).
   - Facturación estimada total y por cancha.
   - Tasa de ocupación porcentual por cancha.
   - Top 5 clientes por cantidad de reservas confirmadas.
   - Mapa de calor de popularidad día-de-semana × slot.
3. El sistema renderiza KPIs, gráfico de barras (facturación), grilla
   coloreada (heatmap), barras de progreso (ocupación) y tabla
   (clientes).
4. El administrador puede modificar el rango temporal (7, 30 o 90
   días). El sistema vuelve a calcular y renderizar.

**Flujo alternativo A — Sin datos en el rango**

- En el paso 2, si no hay reservas en el rango, el sistema renderiza
  mensajes informativos en cada sección ("No hay datos para este
  rango") sin romper la pantalla.

---
