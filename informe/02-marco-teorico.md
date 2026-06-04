# Capítulo 2 — Marco Teórico

Este capítulo describe los fundamentos técnicos sobre los que se apoyan las
decisiones de diseño e implementación del sistema. Cada sección desarrolla
un concepto, lo contrasta con alternativas posibles y justifica por qué se
adoptó en el contexto del trabajo final.

## 2.1 Arquitectura cliente-servidor y REST

### 2.1.1 Modelo cliente-servidor

La arquitectura **cliente-servidor** es el paradigma dominante para las
aplicaciones web modernas. Consiste en separar la lógica en dos procesos
independientes que se comunican por red: un **servidor** que gestiona el
estado persistente y la lógica de negocio, y uno o múltiples **clientes**
que consumen ese estado y presentan la información al usuario final.

Esta separación habilita propiedades deseables como:

- **Escalabilidad horizontal**: pueden agregarse instancias del servidor
  detrás de un balanceador de carga sin que los clientes se enteren.
- **Heterogeneidad de clientes**: el mismo servidor puede servir a un
  navegador web, una aplicación móvil y un script de integración.
- **Separación de incumbencias**: el equipo de frontend itera la
  experiencia de usuario sin tocar la base de datos; el equipo de backend
  refactoriza la lógica interna sin afectar la interfaz.

El sistema Pádel Turnos adopta esta arquitectura: el **backend** (NestJS +
PostgreSQL) gestiona usuarios, canchas y reservas; el **frontend**
(Next.js) consume los datos vía HTTP y los presenta como interfaz
interactiva.

### 2.1.2 REST como estilo arquitectónico

REST (*Representational State Transfer*), formulado por Roy Fielding en
su tesis doctoral del año 2000, es un estilo arquitectónico para sistemas
distribuidos hipermediales. Sus restricciones principales son:

1. **Cliente-servidor**: separación de incumbencias (ya descripta).
2. **Stateless**: cada solicitud del cliente al servidor contiene toda la
   información necesaria para procesarla; el servidor no mantiene estado
   de sesión entre solicitudes.
3. **Cacheable**: las respuestas deben indicar explícitamente si son
   cacheables, habilitando optimizaciones intermedias.
4. **Interfaz uniforme**: el sistema expone recursos identificados por
   URIs, manipulados mediante un conjunto reducido de verbos HTTP
   (`GET`, `POST`, `PATCH`, `DELETE`), con representaciones estándar
   (típicamente JSON).
5. **Sistema en capas**: el cliente no necesita saber si habla con el
   servidor final o con un proxy intermedio.

El sistema desarrollado expone una API REST cuya nomenclatura sigue las
convenciones del estilo. Por ejemplo, los recursos de la entidad
*Reservation* se manipulan así:

| Verbo | Ruta | Acción |
|---|---|---|
| `GET` | `/api/reservations/me` | Listar reservas del usuario autenticado |
| `POST` | `/api/reservations` | Crear una nueva reserva |
| `PATCH` | `/api/reservations/:id/cancel` | Cancelar una reserva existente |
| `PATCH` | `/api/reservations/:id/reschedule` | Reprogramar una reserva |
| `GET` | `/api/reservations/availability` | Consultar slots disponibles |

Las respuestas y errores siguen un formato consistente devuelto por el
`GlobalExceptionFilter` (ver sección 5.x del Capítulo 5), con códigos de
estado HTTP semánticamente correctos: `201 Created` para alta,
`409 Conflict` para colisión de horarios, `403 Forbidden` para violación
de permisos, etcétera.

### 2.1.3 Documentación con OpenAPI

La especificación **OpenAPI** (anteriormente Swagger) define un formato
estándar para describir APIs REST de manera legible tanto por humanos como
por máquinas. A partir de un documento OpenAPI puede generarse
automáticamente documentación interactiva, clientes en múltiples lenguajes
y conjuntos de tests de contrato.

El backend del sistema utiliza `@nestjs/swagger` para generar la
especificación a partir de los decoradores `@ApiTags`, `@ApiOperation`,
`@ApiProperty`, etc. La documentación interactiva se expone en
`http://localhost:3001/api/docs` y permite probar cada endpoint desde el
navegador, autenticándose con un token JWT obtenido previamente vía
`POST /auth/login`.

---

## 2.2 Frameworks NestJS y Next.js

### 2.2.1 NestJS

**NestJS** es un framework de backend para Node.js inspirado en la
arquitectura modular de Angular y en los principios de aplicaciones
empresariales de Java (Spring). Adopta TypeScript como lenguaje principal,
inyección de dependencias como patrón central, y un sistema de módulos
para organizar el código por dominio.

Su arquitectura por capas resulta especialmente adecuada para la
formalización académica:

- **Controllers**: capa de presentación HTTP. Reciben las requests,
  validan los DTOs, delegan al servicio correspondiente y dan forma a la
  respuesta.
- **Services**: capa de lógica de negocio. Contienen las reglas de
  dominio, orquestan transacciones y publican eventos.
- **Repositories** (en este proyecto, encarnados por el `PrismaService`
  inyectado en los servicios): capa de persistencia. Encapsulan el acceso
  a la base de datos.
- **Guards**: implementan autenticación y autorización transversales.
- **Interceptors**: aplican comportamiento transversal antes o después de
  cada handler (logging, auditoría, transformaciones).
- **Filters**: capturan excepciones de manera centralizada.

Esta organización facilita la aplicación del principio de Responsabilidad
Única (sección 2.6) y permite documentar el sistema con diagramas de
componentes claros.

### 2.2.2 Next.js

**Next.js** es un framework de aplicaciones React que ofrece *server-side
rendering* (SSR), *static site generation* (SSG), enrutamiento basado en
sistema de archivos y optimizaciones automáticas de assets. Desde su
versión 13 introduce el *App Router*, una arquitectura basada en
componentes de servidor (RSC, *React Server Components*) que permite
ejecutar lógica de fetching de datos directamente en el servidor sin
hidratar JavaScript en el cliente.

El sistema utiliza el App Router de Next.js 14. Las páginas se renderizan
mayoritariamente como Server Components (mejor SEO, menor bundle inicial)
e incluyen *islands* de Client Components para las interacciones que
requieren estado local: formularios con validación, calendario
interactivo, gráficos del dashboard administrativo, etc.

### 2.2.3 Elección frente a alternativas

Se evaluaron alternativas como **Express + Sequelize + EJS** o
**Django + Vue**, descartadas por las siguientes razones:

- **NestJS sobre Express puro**: NestJS impone estructura modular,
  inyección de dependencias e integración nativa con TypeScript, OpenAPI,
  validación y testing. Esta estructura facilita la enseñanza y
  documentación del proyecto, característica deseable para un trabajo
  académico.
- **TypeScript end-to-end**: utilizar el mismo lenguaje en backend y
  frontend reduce el cambio cognitivo del desarrollador y permite
  compartir tipos (modelos de Prisma generados, contratos de la API)
  sin duplicación.

---

## 2.3 ORM y modelo relacional con Prisma

### 2.3.1 Mapeo objeto-relacional

Un **Object-Relational Mapper (ORM)** es una capa de software que media
entre el modelo de objetos del lenguaje de programación y el modelo
relacional de la base de datos. Su propósito es liberar al desarrollador
de escribir SQL manualmente para operaciones rutinarias (alta, baja,
modificación, consulta) manteniendo la posibilidad de bajar a SQL crudo
cuando la performance o expresividad lo requiera.

Las ventajas principales de un ORM son:

- **Productividad**: menos código repetitivo y boilerplate.
- **Seguridad**: las consultas parametrizadas previenen inyecciones SQL
  por defecto.
- **Portabilidad**: el mismo código funciona contra distintos motores
  (PostgreSQL, MySQL, SQLite) cambiando una configuración.
- **Refactorizaciones tipadas**: en el caso de TypeScript, el compilador
  detecta inconsistencias entre el modelo y las consultas en tiempo de
  compilación.

### 2.3.2 Prisma

**Prisma** es un ORM moderno para Node.js/TypeScript que adopta un enfoque
*schema-first*: el desarrollador define el modelo de datos en un archivo
declarativo `schema.prisma`, y la herramienta genera automáticamente:

1. El cliente TypeScript tipado con autocompletado e inferencia de
   tipos.
2. Las migraciones SQL incrementales para llevar el schema de la base al
   estado declarado.

Un fragmento del archivo `schema.prisma` del proyecto, correspondiente al
modelo `Reservation`:

```prisma
model Reservation {
  id        String            @id @default(uuid()) @db.Uuid
  userId    String            @db.Uuid
  courtId   String            @db.Uuid
  startTime DateTime          @db.Timestamptz(6)
  endTime   DateTime          @db.Timestamptz(6)
  status    ReservationStatus @default(CONFIRMED)
  notes     String?           @db.VarChar(500)

  user  User  @relation(fields: [userId], references: [id], onDelete: Restrict)
  court Court @relation(fields: [courtId], references: [id], onDelete: Restrict)

  @@index([courtId, startTime, endTime])
  @@index([userId, startTime])
  @@index([status])
}
```

Este fragmento expresa, en un sólo lugar y de manera legible: tipos de
datos, relaciones, políticas de borrado (`onDelete: Restrict` previene
borrar usuarios o canchas con reservas asociadas) e índices compuestos
optimizados para las consultas más frecuentes del sistema.

### 2.3.3 PostgreSQL como motor

El sistema utiliza **PostgreSQL** como base de datos por las siguientes
razones:

- Soporte robusto de transacciones ACID con múltiples niveles de
  aislamiento, incluido *Serializable Snapshot Isolation* (SSI),
  fundamental para la lógica del Capítulo 5.
- Tipos de datos avanzados: `Timestamptz` (timestamp con zona horaria),
  `Uuid` nativos, arrays nativos para colecciones simples como los
  servicios del club, JSON estructurado para metadata flexible.
- Madurez del ecosistema y disponibilidad de operadores administrativos
  (`EXPLAIN ANALYZE`, `pg_isready`, etcétera).
- Licencia abierta y gratuita.

---

## 2.4 Autenticación y autorización con JWT

### 2.4.1 Diferencia entre autenticación y autorización

La **autenticación** es el proceso de verificar la identidad de un actor
(¿quién es?). La **autorización** es el proceso de verificar si ese actor
tiene permiso para ejecutar una acción concreta (¿qué puede hacer?). Son
mecanismos complementarios pero distintos: un usuario autenticado puede
no estar autorizado para una operación específica (caso típico: un
cliente intentando crear una cancha, función reservada al administrador).

### 2.4.2 JSON Web Tokens (JWT)

Un **JWT** (RFC 7519) es un formato compacto y autocontenido para
representar afirmaciones entre dos partes. Se compone de tres segmentos
codificados en Base64URL y separados por puntos: cabecera, payload y
firma. La firma criptográfica garantiza que el contenido no fue
manipulado después de emitirse.

A diferencia de los tradicionales *session cookies* persistidas en el
servidor, un JWT es **stateless**: el servidor no necesita mantener una
tabla de sesiones activas, basta con validar la firma del token recibido
y leer las afirmaciones del payload (típicamente `sub` con el identificador
del usuario, `role` con su rol y `exp` con el vencimiento).

Esta propiedad es valiosa para arquitecturas distribuidas porque
cualquier instancia del backend puede validar un token sin consultar una
fuente central de sesiones.

### 2.4.3 Esquema dual access + refresh

El sistema implementa el patrón estándar para aplicaciones de página
única (SPA) y móviles, recomendado por OWASP: dos tokens con
responsabilidades separadas.

- **Access token**: corta vida (15 minutos por defecto). Acompaña cada
  request al backend en el header `Authorization: Bearer <token>`. Si
  un atacante lo obtiene, su ventana de explotación es acotada.

- **Refresh token**: larga vida (7 días por defecto). Vive sólo en el
  cliente y se intercambia con el backend exclusivamente cuando el
  access token vence, para obtener uno nuevo sin requerir que el usuario
  vuelva a ingresar credenciales.

Ambos tokens se firman con secretos distintos, declarados en variables
de entorno y validados al inicio del proceso (sección 5.x).

### 2.4.4 Autorización por roles

El sistema reconoce dos roles principales: `USER` (cliente) y `ADMIN`
(administrador del complejo). El control se realiza mediante:

- Un **guard global** `JwtAuthGuard` que exige autenticación por
  defecto a todos los endpoints; las excepciones se marcan con un
  decorador `@Public()`.
- Un **guard auxiliar** `RolesGuard` que se aplica selectivamente con
  un decorador `@Roles(Role.ADMIN)`. Lee la metadata declarada por el
  decorador y compara contra el rol del usuario autenticado en la
  request.

Este enfoque, llamado *secure by default*, asegura que cualquier
endpoint nuevo creado por un desarrollador queda automáticamente
protegido a menos que se marque explícitamente como público — minimizando
el riesgo de exposición accidental de datos.

---

## 2.5 Concurrencia y aislamiento transaccional

Esta sección desarrolla el fundamento teórico de la decisión técnica más
relevante del proyecto: cómo garantizar que dos clientes que intenten
reservar el mismo horario simultáneamente no terminen con dos reservas
solapadas.

### 2.5.1 Anomalías de concurrencia

Cuando dos o más transacciones se ejecutan simultáneamente sobre los
mismos datos, sin un mecanismo de control adecuado, pueden ocurrir
anomalías clásicas:

- **Lost update**: dos transacciones leen el mismo valor, lo modifican y
  lo escriben. La segunda escritura sobreescribe la primera, perdiendo
  el cambio intermedio.
- **Dirty read**: una transacción lee datos modificados por otra
  transacción que aún no fue confirmada (*commit*). Si la segunda hace
  *rollback*, la primera trabajó con datos que nunca existieron.
- **Non-repeatable read**: una transacción lee el mismo dato dos veces y
  obtiene valores distintos porque otra transacción lo modificó entre
  ambas lecturas.
- **Phantom read**: una transacción ejecuta dos veces la misma consulta
  con un predicado y obtiene un conjunto de filas distinto porque otra
  transacción insertó o eliminó filas que cumplen el predicado.

En el escenario crítico de Pádel Turnos, la anomalía relevante es el
**phantom read**: dos transacciones consultan "¿existe alguna reserva
para la Cancha Norte entre las 13:00 y las 14:30 del 24 de mayo?",
ambas obtienen "no" como respuesta, ambas insertan una reserva — y el
sistema termina con dos reservas conflictivas para el mismo turno.

### 2.5.2 Niveles de aislamiento del estándar SQL

El estándar SQL define cuatro niveles de aislamiento que definen qué
anomalías se previenen:

| Nivel | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| Read Uncommitted | Posible | Posible | Posible |
| Read Committed | Previene | Posible | Posible |
| Repeatable Read | Previene | Previene | Posible |
| Serializable | Previene | Previene | Previene |

`Serializable` es el más fuerte: garantiza que el resultado de ejecutar
transacciones concurrentes sea **equivalente a alguna ejecución
secuencial** de las mismas. Esta propiedad implica que las transacciones
se comportan *como si* corrieran una después de la otra, eliminando
todas las anomalías clásicas.

### 2.5.3 Serializable Snapshot Isolation (SSI)

La implementación clásica de Serializable se basa en bloqueos de dos
fases (2PL), que penaliza fuertemente la concurrencia. PostgreSQL adopta
una implementación más moderna denominada **Serializable Snapshot
Isolation** (SSI), introducida por Cahill, Röhm y Fekete (2008).

SSI permite que las transacciones ejecuten en paralelo sobre snapshots
consistentes, detectando *durante el commit* si dos transacciones
podrían producir un resultado no equivalente a una ejecución serial. En
caso de detectar tal conflicto, PostgreSQL aborta una de las
transacciones con el código de error `40001 / serialization_failure`,
delegando al cliente la decisión de reintentar.

### 2.5.4 Bloqueo explícito `SELECT ... FOR UPDATE`

Complementariamente, PostgreSQL ofrece el bloqueo a nivel de fila
mediante la cláusula `FOR UPDATE`. Las filas leídas con esta cláusula
quedan bloqueadas hasta el final de la transacción: ninguna otra
transacción puede modificarlas o bloquearlas en paralelo.

El proyecto combina ambos mecanismos:

1. La transacción de creación de reserva se ejecuta bajo nivel
   `Serializable`, garantizando que PostgreSQL detecte phantom reads.
2. Dentro de la transacción, se ejecuta una consulta `SELECT ... FOR
   UPDATE` sobre las reservas potencialmente solapadas, bloqueando
   esas filas para evitar modificaciones concurrentes (escenarios donde
   una reserva existente está siendo cancelada simultáneamente).

### 2.5.5 Patrón de reintento ante serialization failure

Dado que las transacciones serializables pueden abortar legítimamente
con `40001`, el código cliente debe estar preparado para reintentar.
El proyecto encapsula esta lógica en un helper `withSerializableRetry`
que detecta el error específico de Prisma (`P2034`) y reintenta hasta
tres veces con *backoff exponencial* breve (20 ms, 40 ms, 80 ms).

Esta combinación de Serializable + FOR UPDATE + retry produce un
sistema robusto donde, ante dos solicitudes simultáneas para el mismo
slot, una se persiste correctamente y la otra recibe una respuesta
`409 Conflict` semánticamente apropiada — sin posibilidad de dos
reservas duplicadas.

---

## 2.6 Principios SOLID y patrones aplicados

### 2.6.1 Principios SOLID

Los principios SOLID son cinco lineamientos para el diseño de software
orientado a objetos, popularizados por Robert C. Martin. El proyecto
aplica especialmente los siguientes:

**Single Responsibility Principle (SRP).** Cada clase tiene una sola
razón para cambiar. Los servicios del sistema están segmentados por
dominio: `AuthService` se ocupa de credenciales y tokens,
`ReservationsService` de la lógica de reservas, `NotificationsService`
de despachar notificaciones. Si en el futuro cambia el motor de email,
sólo se modifica `EmailChannel`; el resto del sistema no se entera.

**Open/Closed Principle (OCP).** El software debe estar abierto a
extensión pero cerrado a modificación. La interfaz
`INotificationChannel`, con un único método `send(payload)`, permite
sumar nuevos canales (WhatsApp, SMS, push) creando una nueva clase
implementadora — sin modificar el `NotificationsService` ni los
emisores de eventos.

**Dependency Inversion Principle (DIP).** Los módulos de alto nivel no
deben depender de módulos de bajo nivel; ambos deben depender de
abstracciones. El sistema implementa este principio mediante la
inyección de dependencias provista por NestJS: los servicios de alto
nivel reciben sus dependencias por constructor (`PrismaService`,
`JwtService`, `ConfigService`), facilitando reemplazos en tests
unitarios sin tocar el código de producción.

### 2.6.2 Patrones de diseño aplicados

**Strategy.** El subsistema de notificaciones implementa este patrón
con `INotificationChannel` como interfaz y `EmailChannel` /
`WhatsAppChannel` como estrategias concretas. El cliente
(`NotificationsService`) elige la estrategia adecuada en tiempo de
ejecución sin acoplarse a la implementación específica.

**Observer.** El subsistema de reservas publica eventos del dominio
(`reservation.confirmed`, `reservation.cancelled`) mediante un
`EventEmitter` global. El `ReservationListener` se suscribe a estos
eventos y delega el envío de la notificación pertinente al
`NotificationsService`. Esta separación desacopla la lógica de
persistencia de reservas de la lógica de comunicación, facilitando
agregar nuevos consumidores (auditoría, integraciones externas) sin
modificar el emisor.

**Repository.** Aunque el proyecto no implementa una capa Repository
explícita (los servicios consumen directamente el `PrismaService`), el
patrón se respeta semánticamente: el acceso a datos está encapsulado
dentro de los servicios de dominio, no expuesto a controladores ni
vistas.

**Singleton.** El modelo `ClubInfo` (información institucional del
complejo) se implementa como singleton lógico con `id @default("default")`:
una única fila representa toda la configuración pública del club. El
servicio asociado garantiza la creación lazy con valores por defecto al
primer acceso.

**Decorator (en sentido amplio).** TypeScript y NestJS hacen uso
extensivo de decoradores para declarar comportamiento transversal:
`@Roles(Role.ADMIN)`, `@Public()`, `@Throttle(...)`, `@ApiOperation(...)`.
Cada decorador agrega metadata al elemento decorado, que es leída por
los guards, interceptors o herramientas de documentación
correspondientes — manteniendo el código de negocio libre de detalles
infraestructurales.

### 2.6.3 Otras buenas prácticas aplicadas

- **DRY (Don't Repeat Yourself)**: las reglas de negocio (anticipación
  mínima/máxima, plazo de cancelación, cupo) viven en un único archivo
  `booking-policy.ts` y son referenciadas desde donde se aplican.
- **Fail Fast**: la validación de variables de entorno con Joi al
  inicio del proceso impide que la aplicación arranque con
  configuración inválida.
- **Secure by Default**: el `JwtAuthGuard` global requiere autenticación
  en todos los endpoints; las excepciones son explícitas vía
  `@Public()`.
- **Idempotency**: los jobs programados marcan `reminderSent=true` tras
  enviar un recordatorio, evitando duplicados en ejecuciones repetidas.

---
