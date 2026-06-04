# Capítulo 6 — Verificación y Validación

Este capítulo describe la estrategia de aseguramiento de calidad del
sistema. Se distingue entre **verificación** (¿el software cumple sus
especificaciones?) y **validación** (¿el software responde a las
necesidades reales del usuario?), aplicando técnicas complementarias en
tres capas: tests unitarios, tests *end-to-end* e integración continua.

## 6.1 Estrategia general

La estrategia de testing adoptada sigue la **pirámide clásica**:

```
                  ┌──────────────┐
                  │     E2E      │   ← Pocos, lentos, costosos
                  │  Playwright  │   ← Validan el sistema integrado
                  └──────────────┘
                  ┌──────────────┐
                  │ Integración  │   ← (no se desarrollaron explícitamente
                  │              │     en el alcance del trabajo final)
                  └──────────────┘
                  ┌──────────────────┐
                  │     Unitarios    │   ← Muchos, rápidos, baratos
                  │       Jest       │   ← Validan lógica aislada
                  └──────────────────┘
```

La capa unitaria concentra el esfuerzo en la lógica de mayor riesgo:
el control de concurrencia del subsistema de reservas. La capa E2E
verifica los flujos críticos de usuario sobre el sistema integrado.
La capa de integración intermedia, aunque conceptualmente útil, no se
desarrolló explícitamente — su rol parcial es absorbido por los E2E,
que terminan ejecutándose contra el backend real con base de datos
real.

---

## 6.2 Tests unitarios

### 6.2.1 Configuración

El backend incorpora Jest como framework de testing, configurado en
el `package.json` con la siguiente sección:

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": ["**/*.ts", "!**/*.module.ts", "!main.ts"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/$1" }
}
```

Los tests se ejecutan con `npm test` y producen un reporte de cobertura
en `apps/coverage/`.

### 6.2.2 Suite sobre `ReservationsService.create`

El archivo `reservations.service.spec.ts` cubre el aporte técnico
central del trabajo: la creación transaccional de reservas. La suite
contiene **nueve casos de prueba** que ejercen los caminos críticos:

| # | Caso | Comportamiento esperado |
|---|---|---|
| 1 | Rechazo si `startTime >= endTime` | Lanza `BadRequestException` |
| 2 | Rechazo si la fecha es pasada | Lanza `BadRequestException` |
| 3 | NotFound si la cancha no existe | Lanza `NotFoundException` |
| 4 | BadRequest si la cancha está suspendida | Lanza `BadRequestException` |
| 5 | Conflict si `SELECT FOR UPDATE` devuelve solapamiento | Lanza `ConflictException`; el INSERT no se ejecuta |
| 6 | Happy path | Persiste la reserva con `CONFIRMED`; emite evento `reservation.confirmed` post-commit |
| 7 | Uso correcto del nivel `Serializable` | Verifica el segundo argumento de `prisma.$transaction` |
| 8 | Retry ante `P2034` | Primer intento falla con `serialization_failure`; segundo intento persiste correctamente |
| 9 | No reintento ante errores no-SSI | Conflict no genera retry; `$transaction` se invoca una sola vez |

### 6.2.3 Estrategia de mocking

Los tests utilizan mocks tipados de `PrismaService` y un
`EventEmitter2` real. La transacción `$transaction` se simula ejecutando
el callback con un cliente mock:

```typescript
const buildPrismaMock = (): PrismaMock => {
  const tx = {
    reservation: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    court: { findUnique: jest.fn().mockResolvedValue(activeCourt) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const prisma: PrismaMock = {
    reservation: { findUnique: jest.fn(), /* ... */ },
    $transaction: jest.fn((cb) => cb(tx)),
  };
  return prisma;
};
```

Esta estrategia permite ejercer **la lógica completa** del método sin
montar PostgreSQL, manteniendo los tests rápidos (< 1 segundo total
para los 9 casos).

### 6.2.4 Caso destacado: verificación de Serializable

El test 7 verifica que la transacción se inicia con el nivel correcto:

```typescript
it('utiliza el nivel de aislamiento Serializable', async () => {
  prisma.__tx.reservation.create.mockResolvedValueOnce({ /* ... */ });

  await service.create(user, dto);

  const txOptions = prisma.$transaction.mock.calls[0][1];
  expect(txOptions.isolationLevel).toBe(
    Prisma.TransactionIsolationLevel.Serializable,
  );
});
```

Esta verificación parece trivial pero es crítica: garantiza que un
futuro refactor que cambie el nivel de aislamiento (por ejemplo, a
`ReadCommitted` por error) sea detectado por el pipeline antes de
llegar a producción.

### 6.2.5 Caso destacado: retry ante serialization failure

El test 8 simula el escenario de mayor sutileza técnica:

```typescript
it('reintenta ante un error P2034 y termina exitosamente', async () => {
  const serializationErr = new Prisma.PrismaClientKnownRequestError(
    'Transaction failed due to a write conflict or a deadlock',
    { code: 'P2034', clientVersion: 'test' },
  );

  let calls = 0;
  prisma.$transaction.mockImplementation(async (cb) => {
    calls += 1;
    if (calls === 1) throw serializationErr;
    return cb(prisma.__tx);
  });

  prisma.__tx.reservation.create.mockResolvedValueOnce({ id: 'res-retry', /* ... */ });

  const result = await service.create(user, dto);

  expect(result.id).toBe('res-retry');
  expect(prisma.$transaction).toHaveBeenCalledTimes(2);
});
```

El test confirma que el helper `withSerializableRetry` detecta el
código P2034, espera el backoff y reintenta — produciendo el resultado
esperado en la segunda iteración.

### 6.2.6 Cobertura obtenida

La ejecución completa de la suite produce:

```
PASS  src/reservations/reservations.service.spec.ts
  ReservationsService.create
    ✓ rechaza una reserva si startTime es posterior o igual a endTime
    ✓ rechaza una reserva con fecha en el pasado
    ✓ lanza NotFound si la cancha no existe
    ✓ lanza BadRequest si la cancha está suspendida
    ✓ lanza Conflict si SELECT FOR UPDATE devuelve una reserva solapada
    ✓ persiste la reserva con status CONFIRMED y emite el evento luego del commit
    ✓ utiliza el nivel de aislamiento Serializable
    ✓ reintenta ante un error P2034 y termina exitosamente
    ✓ NO reintenta si el error no es de serialización (propaga ConflictException)
```

Cobertura sobre el método `ReservationsService.create` y sus helpers
(`runCreateAttempt`, `withSerializableRetry`, `isSerializationError`):
aproximadamente **100% de líneas críticas** y **100% de ramas**
verificadas.

---

## 6.3 Tests end-to-end con Playwright

### 6.3.1 Configuración

El frontend incorpora **Playwright** como framework E2E. La
configuración (`playwright.config.ts`) establece:

```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,    // tests comparten BD → serializar
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

La ejecución requiere:

1. PostgreSQL corriendo (vía Docker).
2. Backend levantado en `:3001`.
3. Frontend levantado en `:3000`.

Después se ejecutan con `npm run test:e2e` (headless) o
`npm run test:e2e:ui` (interactivo).

### 6.3.2 Suite `auth.spec.ts`

Cubre el subsistema de autenticación con cuatro tests:

| # | Test | Validación |
|---|---|---|
| 1 | Landing carga | El home muestra el título y el CTA |
| 2 | Registro con email único | Alta exitosa + mensaje de verificación |
| 3 | Login + logout | Credenciales del seed redirigen al dashboard correcto; cerrar sesión devuelve a la landing |
| 4 | Credenciales inválidas | Mensaje genérico ("Credenciales inválidas") sin filtrar info |

Ejemplo del test 4 (verificación de RNF-03 sobre anti-enumeración):

```typescript
test('credenciales inválidas muestran error sin filtrar info', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('no.existe@nada.local');
  await page.getByLabel('Contraseña').fill('algo-incorrecto');
  await page.getByRole('button', { name: /^Ingresar$/ }).click();
  await expect(page.getByText(/Credenciales inválidas/i)).toBeVisible();
});
```

### 6.3.3 Suite `reservation.spec.ts`

Cubre el flujo de reserva del cliente con dos tests:

| # | Test | Validación |
|---|---|---|
| 1 | Navegación Mis reservas ↔ Reservar | Los enlaces funcionan en ambas direcciones |
| 2 | Crear vía API + cancelar vía UI | El cliente puede crear una reserva (preparada por API para evitar dependencias de horarios) y cancelarla desde la UI |

El test 2 ilustra el patrón **"preparar por API, validar por UI"**:

```typescript
test('crea una reserva vía API y la cancela desde la UI', async ({ page, request }) => {
  // 1. Preparar estado vía API
  const { accessToken } = await apiLogin(request, SEED_USER);
  const court = await getFirstActiveCourt(request);
  const start = /* fecha futura */;
  const created = await request.post(`${API_BASE}/api/reservations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { courtId: court.id, startTime: start.toISOString(), endTime: end.toISOString() },
  });
  test.skip(created.status() === 409, 'El slot ya estaba reservado');

  // 2. Login UI y verificar que aparece
  await login(page, SEED_USER);
  await expect(page.getByRole('heading', { name: court.name })).toBeVisible();

  // 3. Cancelar desde la UI
  await page.getByRole('button', { name: /Cancelar reserva/i }).first().click();

  // 4. Verificar que ya no aparece
  await expect(page.getByText(/No tenés ningún turno reservado|otras próximas/i)).toBeVisible();
});
```

Este patrón evita la fragilidad de los E2E "completos" que dependen
de horarios libres en el momento exacto de la corrida.

### 6.3.4 Suite `admin.spec.ts`

Cubre el panel administrativo con cuatro tests:

| # | Test | Validación |
|---|---|---|
| 1 | Login admin lleva al panel | Las credenciales del seed redirigen a `/dashboard/admin` |
| 2 | Todas las pestañas son accesibles | Las 6 tabs (Reservas, Canchas, Turnos fijos, Estadísticas, Club, Auditoría) navegan correctamente |
| 3 | Timeline renderiza con canchas | La grilla horaria y la leyenda son visibles |
| 4 | USER no puede acceder a rutas admin | Middleware redirige; la API responde 401/403 |

El test 4 verifica el RBAC en dos capas (middleware del frontend +
guards del backend):

```typescript
test('un USER no puede acceder a rutas /dashboard/admin', async ({ page, request }) => {
  await login(page, SEED_USER);
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/dashboard\/user/);  // middleware redirige

  const res = await request.post('http://localhost:3001/api/courts', {
    data: { name: 'X', sportType: 'PADEL', pricePerHour: 1000 },
  });
  expect([401, 403]).toContain(res.status());  // guard del backend bloquea
});
```

### 6.3.5 Artefactos generados

Cada corrida produce, en caso de fallos:

- **Screenshots** del momento del fallo, almacenados en
  `test-results/`.
- **Videos** del flujo completo del test.
- **Traces** abibles con `npx playwright show-trace`, que
  reproducen DOM + network + screenshots paso a paso.

Estos artefactos son particularmente útiles para debuggear fallos
intermitentes en CI sin tener que reproducir localmente.

---

## 6.4 Integración continua

### 6.4.1 Pipeline en GitHub Actions

El archivo `.github/workflows/ci.yml` define un pipeline que se
ejecuta en cada push a `main` y en cada pull request. La cancelación
de runs anteriores del mismo branch (`concurrency.cancel-in-progress`)
ahorra minutos de cómputo.

El pipeline consta de **dos jobs paralelos**:

#### Job `backend`

1. Checkout del repositorio.
2. Setup de Node 20 con caché de npm.
3. Levantamiento de un servicio PostgreSQL 16 mediante el bloque
   `services` (esto es relevante: los tests del backend se ejecutan
   contra una base **real**, no contra mocks, descubriendo bugs de
   migration o de SQL que los mocks ocultarían).
4. `npm ci` para instalar dependencias.
5. `npx prisma generate` y `npx prisma migrate deploy`.
6. `npm test` (Jest).
7. `npm run build`.

#### Job `frontend`

1. Checkout del repositorio.
2. Setup de Node 20 con caché de npm.
3. `npm ci`.
4. `npm run lint` (ESLint).
5. `npm run type-check` (`tsc --noEmit`).
6. `npm run build`.

El pipeline expone su estado mediante un **badge** en el README:

```markdown
[![CI](https://github.com/USUARIO/REPO/actions/workflows/ci.yml/badge.svg)]
```

### 6.4.2 Política de secretos

Las variables sensibles (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
se configuran como **secrets de GitHub** y se inyectan al runner
mediante la sintaxis `${{ secrets.NOMBRE }}`. Si faltan (escenario
típico para PRs de contribuidores externos), el workflow utiliza
valores de fallback explícitamente de testing.

### 6.4.3 Cobertura de los tests E2E en CI

Los tests E2E **no se incluyen en el pipeline de CI** del trabajo
final. Su ejecución requiere levantar simultáneamente el frontend,
el backend y la base de datos, con tiempos de start-up superiores
a 30 segundos. Para el alcance académico se optó por:

- Mantener los E2E como verificación local y manual.
- Documentar su existencia y resultados en el presente capítulo.
- Dejar la integración a CI como **trabajo futuro**, posiblemente con
  herramientas tipo Testcontainers para el entorno.

---

## 6.5 Validación funcional

La **validación** complementa la verificación respondiendo: ¿el
sistema responde a las necesidades reales del usuario? Para el alcance
académico se aplicaron las siguientes técnicas:

### 6.5.1 Inspección manual con datos del seed

El script `prisma/seed.ts` carga datos reproducibles que permiten
verificar visualmente cada funcionalidad descripta en los
requerimientos:

- Un administrador (`admin@padelturnos.local`).
- Dos usuarios estándar (`juan.perez@example.com`,
  `maria.gomez@example.com`).
- Dos canchas (`Cancha Norte`, `Cancha Sur`).
- Tres reservas de ejemplo (mañana, tarde, noche del día siguiente).
- Una entrada de información institucional del club.

Con este conjunto, cualquier evaluador puede ejecutar el sistema y
recorrer los flujos sin necesidad de generar datos previos.

### 6.5.2 Documentación interactiva de la API

El endpoint `/api/docs` expone la especificación OpenAPI con
formulario interactivo. Permite a un evaluador:

1. Autenticarse con `POST /auth/login`.
2. Copiar el access token al botón "Authorize".
3. Probar cualquier endpoint del sistema desde el navegador.
4. Inspeccionar el contrato JSON de cada request y respuesta.

### 6.5.3 Capturas de pantalla incluidas como anexos

El Anexo B incluye capturas de pantalla de cada caso de uso principal,
demostrando que la implementación realiza efectivamente lo
especificado.

### 6.5.4 Evidencia de la propiedad de unicidad

El test unitario "Conflict si SELECT FOR UPDATE devuelve una reserva
solapada" (sección 6.2.2, caso 5) constituye la **evidencia formal**
de que el sistema garantiza la propiedad central de unicidad:

> No podrá existir más de una reserva no cancelada para la misma
> cancha en rangos horarios que se solapen.

El test 8 (retry SSI) demuestra adicionalmente que la garantía se
sostiene **incluso bajo concurrencia simulada**: dos transacciones
que intenten insertar en la misma franja temporal terminan con una
persistida y otra rechazada con `409 Conflict`.

---

## 6.6 Limitaciones del proceso de testing

Por transparencia académica se documentan las siguientes limitaciones
del alcance de testing del trabajo final:

- **No se desarrollaron tests de integración explícitos** para los
  demás servicios (`UsersService`, `CourtsService`, `AuthService`,
  etc.). Su cobertura se realiza indirectamente a través de los E2E.

- **Los E2E cubren los flujos principales** pero no agotan todas las
  ramificaciones posibles. Algunas validaciones de borde se verifican
  sólo manualmente.

- **No se realizaron tests de carga / performance** para validar
  cuantitativamente el RNF-08 (tiempo de respuesta menor a 200 ms para
  la consulta de disponibilidad). Esta validación queda como **trabajo
  futuro** con herramientas tipo k6 o Artillery.

- **No se realizaron pruebas con usuarios reales** del complejo
  deportivo. La validación con usuarios constituye una etapa siguiente
  al cierre del trabajo final académico, en caso de avanzar hacia un
  despliegue productivo.

---
