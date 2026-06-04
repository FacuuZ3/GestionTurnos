# Capítulo 7 — Conclusiones y Trabajo Futuro

Este capítulo cierra el documento reflexionando sobre el cumplimiento de
los objetivos planteados, los aprendizajes obtenidos durante el desarrollo
y las líneas de continuación posibles del proyecto.

## 7.1 Objetivos alcanzados

Se revalida a continuación cada objetivo específico planteado en la
sección 1.3, indicando dónde y cómo se concretó.

### OE1 — Modelar el dominio en una base de datos relacional

**Cumplido.** El archivo `prisma/schema.prisma` formaliza siete
entidades (`User`, `Court`, `Reservation`, `RecurringReservation`,
`ClubInfo`, `AuditLog`) con tipos precisos, relaciones, políticas de
borrado e índices compuestos optimizados (Cap. 4.2). El índice
`(courtId, startTime, endTime)` sobre la tabla de reservas habilita
consultas eficientes de solapamiento, que es la operación más
frecuente del sistema.

### OE2 — API REST autenticada con autorización por roles

**Cumplido.** El backend expone aproximadamente cuarenta endpoints
organizados en módulos cohesivos. La autenticación se implementa con
JWT dual (Cap. 5.3), la autorización con un `RolesGuard` que
discrimina `USER` y `ADMIN`. La documentación interactiva está
disponible en `/api/docs` mediante OpenAPI (Cap. 2.1.3).

### OE3 — Unicidad de reserva con concurrencia robusta

**Cumplido.** Esta es la contribución técnica central. La creación de
reservas se ejecuta en una transacción `Serializable` con bloqueo
explícito `SELECT ... FOR UPDATE`, complementada con un mecanismo de
reintento automático ante errores de serialización (Cap. 5.4). Se
demostró formalmente mediante tests unitarios (Cap. 6.2) que dos
solicitudes simultáneas para el mismo slot resultan en exactamente
una reserva persistida y la otra rechazada con `409 Conflict`.

### OE4 — Interfaz web responsiva, accesible y con modo oscuro

**Cumplido.** El frontend Next.js 14 implementa una interfaz adaptable
a dispositivos móviles, con soporte de modo claro/oscuro persistido
mediante `next-themes`, tipografía Geist y paleta sobria emerald +
zinc. Las interacciones críticas (formularios, modales) utilizan
primitivas accesibles de Radix UI con etiquetas ARIA correctas.

### OE5 — Reglas de negocio codificadas y centralizadas

**Cumplido.** Las cuatro reglas del dominio (anticipación mínima,
máxima, plazo de cancelación, cupo por usuario) están definidas en un
único archivo `booking-policy.ts` (Cap. 4.5) y referenciadas desde
donde se aplican. El rol `ADMIN` está exento de manera explícita y
documentada.

### OE6 — Subsistema de notificaciones por email

**Cumplido.** El módulo `NotificationsModule` despacha cinco tipos
de correos (verificación de cuenta, confirmación de reserva,
cancelación, recordatorio 24 hs antes, reseteo de contraseña).
Implementa el patrón Strategy con `INotificationChannel`, dejando
preparada la incorporación futura de un `WhatsAppChannel` sin
modificar el código existente (Cap. 5.5).

### OE7 — Dashboard estadístico y registro de auditoría

**Cumplido.** El `StatsService` calcula seis métricas agregadas
(totales por estado, facturación estimada total y por cancha, tasa de
ocupación, top de clientes, heatmap día × horario), presentadas con
visualizaciones interactivas Recharts (Cap. 5.7.2). El `AuditModule`
registra inmutablemente cada acción de mutación realizada por un
administrador, consultable desde la pestaña "Auditoría" del panel
(Cap. 5.8.3).

### OE8 — Tests unitarios y end-to-end con integración continua

**Cumplido.** Nueve tests unitarios sobre la lógica transaccional
crítica (Cap. 6.2). Diez tests end-to-end con Playwright sobre los
flujos principales de usuario y administrador (Cap. 6.3). Pipeline de
integración continua en GitHub Actions con dos jobs paralelos
(backend con PostgreSQL real, frontend con lint + typecheck + build)
ejecutándose en cada pull request (Cap. 6.4).

### Cobertura final de objetivos

Los ocho objetivos específicos planteados al inicio del proyecto se
cumplieron en su totalidad. El sistema entregado es funcional,
documentado, testeado y desplegable en un entorno local mediante
Docker. La trazabilidad bidireccional entre objetivos, requerimientos,
diseño, implementación y verificación queda demostrada a lo largo del
documento.

---

## 7.2 Aprendizajes

El desarrollo del proyecto produjo aprendizajes en tres dimensiones
complementarias.

### 7.2.1 Aprendizajes técnicos

**Sobre concurrencia y aislamiento transaccional.** Comprender por
qué un sistema aparentemente correcto puede producir reservas
duplicadas bajo carga concurrente requiere bajar al nivel de las
anomalías clásicas del SQL Standard y conocer cómo PostgreSQL
implementa el aislamiento serializable. La diferencia entre `Read
Committed` (el default de muchos sistemas, susceptible a phantom
reads) y `Serializable` (formalmente correcto) no es académica: se
materializa en bugs reproducibles cuando dos clientes pulsan
simultáneamente "Confirmar reserva". La construcción del helper
`withSerializableRetry` enseñó que un sistema robusto no solo debe
elegir el nivel de aislamiento correcto, sino también prepararse para
los abortos legítimos que dicho nivel impone al cliente.

**Sobre la separación entre validación, autorización y lógica de
dominio.** NestJS, con su sistema de guards, interceptors, filters
y decoradores, fuerza a separar responsabilidades transversales del
código de negocio. Implementar `RolesGuard` una sola vez y aplicarlo
declarativamente con `@Roles(Role.ADMIN)` es cualitativamente
distinto a verificar el rol al inicio de cada controlador — incluso
si el comportamiento observable es el mismo. La separación facilita
el testing, la auditoría y la modificación futura de la política de
seguridad.

**Sobre el desacople mediante eventos.** Publicar
`reservation.confirmed` como evento de dominio y dejar que un
listener decida si enviar email, registrar auditoría o notificar a un
sistema externo es más flexible que llamar directamente al
`NotificationsService` desde el `ReservationsService`. El costo es
un nivel de indirección; el beneficio es la capacidad de sumar
consumidores sin modificar el productor, fundamental para el
crecimiento de un sistema.

**Sobre la importancia de las zonas horarias.** El bug donde "no se
podía reservar para mañana" reveló que `new Date("2026-05-21")` se
interpreta como UTC, mientras que `setHours(0, 0, 0, 0)` opera en
hora local — combinación que en husos negativos (Argentina, UTC-3)
produce un corrimiento de un día. La solución (helper
`parseDateLocal` que parsea componente a componente) es trivial; el
aprendizaje no lo es: trabajar con fechas requiere comprender
explícitamente qué representa cada operación, no inferirlo del
nombre.

### 7.2.2 Aprendizajes metodológicos

**Sobre la iteración incremental.** El proyecto se desarrolló en
sprints de funcionalidad acotada (autenticación, reservas, reglas de
negocio, notificaciones, estadísticas, auditoría, observabilidad).
Esta iteración permitió que cada sprint produjera un incremento
demostrable, validable y reversible. Intentar diseñar el sistema
completo de antemano hubiera resultado en decisiones desinformadas
sobre necesidades reales que sólo emergieron al uso.

**Sobre el rol del control de versiones.** Cada decisión técnica
significativa quedó registrada como un commit atómico con mensaje
descriptivo. Esta práctica, además del beneficio obvio de poder
revertir cambios problemáticos, produce una historia legible del
proyecto utilizable como insumo para el presente documento.

**Sobre la documentación inline.** El sistema incluye bloques de
comentario con la convención `REFERENCIA INFORME - Capítulo X` en
cada subsistema relevante. Esta práctica, aunque inusual, facilitó
enormemente la redacción del informe: cada fragmento del código está
auto-etiquetado con la sección donde debe ser citado, eliminando la
necesidad de rastrear retroactivamente qué pieza correspondía a
qué decisión.

### 7.2.3 Aprendizajes personales

**Sobre el equilibrio entre profundidad técnica y alcance.** Durante
el desarrollo surgieron oportunidades atractivas para profundizar más
allá del alcance académico: implementar un sistema de cola con
BullMQ + Redis para los recordatorios, migrar tokens a cookies
HttpOnly con proxy, integrar Sentry para tracking de errores en
producción. Cada una de estas decisiones se documentó como **trabajo
futuro** en lugar de intentar abarcarlas. La capacidad de
**no implementar** algo, sabiendo que aporta valor, es una habilidad
de ingeniería distinta a la de implementar.

**Sobre la utilidad de la inteligencia artificial como herramienta de
acompañamiento.** El desarrollo del proyecto se apoyó en sesiones con
herramientas de IA generativa para generar scaffolding inicial,
discutir alternativas de diseño y depurar errores. Esta colaboración
aceleró la implementación pero no sustituyó la comprensión de cada
decisión: los problemas no triviales (el bug de zonas horarias, el
fix del modal con datos invisibles en dark mode, el flujo de
eliminación en dos pasos) requirieron iteración real entre el
estudiante y la herramienta, identificando síntomas, formulando
hipótesis y validando con el sistema en ejecución.

---

## 7.3 Trabajo futuro

Las siguientes líneas de continuación quedan documentadas para una
eventual evolución del proyecto.

### 7.3.1 Integración con pasarela de pagos

Incorporar **MercadoPago** (estándar de facto en Argentina) para
cobrar una seña al momento de reservar. El alcance estimado incluye:

- Modelo `Payment` con su máquina de estados.
- Endpoint para crear preferencias de Checkout Pro.
- Webhook handler con verificación de firma e *idempotency*.
- Lógica de reservas en estado `PENDING` hasta la confirmación del
  pago, con expiración automática si no se concreta en X minutos.

### 7.3.2 Notificaciones por WhatsApp

Implementar `WhatsAppChannel` con Twilio o Meta Cloud API,
aprovechando la interfaz `INotificationChannel` ya preparada. Esta
extensión es de bajo riesgo: el código existente no requiere
modificaciones, sólo se agrega el nuevo canal en el `Map` de
`NotificationsService`.

### 7.3.3 Migración a tokens HttpOnly con proxy

Los tokens JWT actualmente se persisten en cookies accesibles desde
JavaScript del cliente. Para producción real, migrar a cookies
`HttpOnly` mediante un endpoint proxy en Next.js que inyecte el
header `Authorization` desde la cookie del lado del servidor,
eliminando la superficie de ataque ante XSS.

### 7.3.4 Cola asíncrona con BullMQ

Reemplazar el cron horario de recordatorios por una cola persistida
(**BullMQ** + Redis) que programe cada recordatorio individualmente al
momento de crear la reserva. Beneficios: granularidad arbitraria
(recordatorios a 1 hora, a 24 horas, a 1 semana, etc.), retry
automático con backoff configurable y dashboard de cola.

### 7.3.5 Sistema de lista de espera (waitlist)

Permitir a un usuario anotarse en una lista de espera para un slot
ocupado. Si la reserva original se cancela, el primer anotado recibe
una notificación con quince minutos para confirmar la toma del slot
liberado.

### 7.3.6 Tests de carga (k6 o Artillery)

Validar cuantitativamente el RNF-08 (tiempo de respuesta menor a
200 ms en el percentil 95 para `getAvailability`). Inyectar carga
sintética de hasta 100 requests/segundo y medir latencia, throughput
y uso de CPU/memoria.

### 7.3.7 Modelo de profesores y clases programadas

Extender el dominio con la entidad `Instructor` y permitir crear
turnos asociados a clases dictadas por un profesor. Esto requiere
modelar la matrícula del alumno, la programación recurrente de la
clase y la facturación distinta a la de una reserva libre.

### 7.3.8 Multi-tenancy

Generalizar el sistema para soportar múltiples complejos sobre la
misma instancia. Implica introducir una entidad `Tenant` raíz,
scoping de todas las consultas por `tenantId`, y un panel de
administración cross-tenant para el operador de la plataforma.

### 7.3.9 Integración E2E al pipeline de CI

Incorporar la ejecución de los tests Playwright en GitHub Actions,
posiblemente mediante **Testcontainers** para orquestar Postgres +
backend + frontend en el runner de CI. El esfuerzo principal es de
infraestructura, el código de tests ya existe.

### 7.3.10 Aplicación móvil nativa

Desarrollar una aplicación móvil para iOS y Android con React Native
o Flutter, consumiendo la misma API REST. La actual aplicación web
ya es responsive y soporta su uso desde un navegador móvil; una app
nativa agregaría capacidades como notificaciones push y mejor
integración con el sistema operativo.

---

## 7.4 Reflexión final

El sistema Pádel Turnos demuestra que un trabajo final de Tecnicatura
puede abordar problemas técnicos no triviales, aplicar buenas
prácticas de ingeniería y producir un artefacto utilizable más allá
del aula. La elección de un dominio concreto (gestión de turnos
deportivos en una ciudad real) ancló cada decisión de diseño a una
necesidad verificable, evitando la trampa común de proyectos
académicos que resuelven problemas abstractos sin usuario claro.

El énfasis en la correctitud del subsistema de reservas —desde el
modelo teórico de aislamiento serializable hasta el test unitario
que verifica el retry ante `40001`— refleja la convicción de que
**un sistema que falla silenciosamente bajo carga es peor que uno
que no existe**: una doble reserva no detectada por el software
termina siendo un conflicto humano entre el cliente y el complejo,
deteriorando la confianza que la digitalización debería construir.

Si el sistema logra reducir aunque sea marginalmente la fricción de
reservar una cancha de pádel en Reconquista, el trabajo habrá
cumplido también su tercera dimensión justificatoria: la dimensión
social.

---
