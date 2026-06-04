<div align="center">

# Sistema Integral de Gestión y Reserva de Turnos para Complejos Deportivos de Pádel

---

**Proyecto Final**

Tecnicatura Universitaria en Programación

Universidad Tecnológica Nacional — Facultad Regional Reconquista

---

**Autor**

[Tu Nombre y Apellido]

Legajo N° [XXXXXX]

**Director / Tutor**

[Nombre del Director]

**Reconquista, [Mes] de 2026**

</div>

---

## Resumen

El presente trabajo final desarrolla una plataforma web full-stack para la
gestión integral de reservas de turnos en complejos deportivos de pádel. El
sistema, denominado **Pádel Turnos**, permite a los clientes consultar la
disponibilidad de canchas en tiempo real, reservar turnos en línea, recibir
notificaciones automáticas por email y administrar su propia agenda; y a los
administradores del complejo, gestionar canchas, turnos puntuales, bloqueos
recurrentes (turnos fijos), métricas operativas y trazabilidad de acciones.

La aplicación está construida sobre una arquitectura de monorepo con dos
subproyectos independientes: un **backend** en NestJS 10 con PostgreSQL
y Prisma ORM, expuesto vía API REST documentada con OpenAPI; y un **frontend**
en Next.js 14 con TypeScript estricto, Tailwind CSS y soporte de modo claro
y oscuro. La concurrencia crítica del subsistema de reservas se resuelve con
transacciones de aislamiento *Serializable* combinadas con bloqueos
explícitos `SELECT ... FOR UPDATE` y reintento ante errores de serialización,
garantizando la imposibilidad de duplicar una reserva para el mismo horario.

El proyecto incorpora además políticas de dominio (anticipación mínima y
máxima, plazo de cancelación, cupo por usuario), recordatorios automáticos
por correo electrónico mediante jobs programados, dashboard estadístico para
el administrador con visualizaciones interactivas, y un registro de auditoría
inmutable de las acciones administrativas. La verificación incluye tests
unitarios sobre la lógica transaccional crítica y tests *end-to-end* con
Playwright sobre los flujos principales de usuario, integrados a un pipeline
de integración continua en GitHub Actions.

**Palabras clave**: aplicaciones web, NestJS, Next.js, PostgreSQL, Prisma,
TypeScript, transacciones, concurrencia, JWT, sistemas de reservas.

---

## Índice

1. **Introducción** ........................................................ 1
   - 1.1 Contexto del proyecto
   - 1.2 Planteamiento del problema
   - 1.3 Objetivos
   - 1.4 Alcance
   - 1.5 Justificación
   - 1.6 Estructura del documento

2. **Marco Teórico** ...................................................... X
   - 2.1 Arquitectura cliente-servidor y REST
   - 2.2 Frameworks NestJS y Next.js
   - 2.3 ORM y modelo relacional con Prisma
   - 2.4 Autenticación y autorización con JWT
   - 2.5 Concurrencia y aislamiento transaccional
   - 2.6 Principios SOLID y patrones aplicados

3. **Análisis del Sistema** ............................................... X
   - 3.1 Identificación de actores
   - 3.2 Requerimientos funcionales
   - 3.3 Requerimientos no funcionales
   - 3.4 Casos de uso

4. **Diseño del Sistema** ................................................. X
   - 4.1 Arquitectura general
   - 4.2 Modelo de datos (DER)
   - 4.3 Diagrama de clases del dominio
   - 4.4 Subsistemas
   - 4.5 Reglas de negocio
   - 4.6 Decisiones de diseño

5. **Implementación** ..................................................... X
   - 5.1 Stack tecnológico
   - 5.2 Estructura del repositorio
   - 5.3 Subsistema de autenticación
   - 5.4 Subsistema de reservas con control de concurrencia
   - 5.5 Subsistema de notificaciones
   - 5.6 Tareas programadas (recordatorios)
   - 5.7 Subsistema administrativo
   - 5.8 Observabilidad: health checks, logs estructurados, auditoría
   - 5.9 Frontend: experiencia de usuario y administración

6. **Verificación y Validación** ......................................... X
   - 6.1 Tests unitarios
   - 6.2 Tests end-to-end con Playwright
   - 6.3 Integración continua (CI)
   - 6.4 Validación funcional con usuarios reales

7. **Conclusiones y Trabajo Futuro** ..................................... X
   - 7.1 Objetivos alcanzados
   - 7.2 Aprendizajes
   - 7.3 Trabajo futuro

**Anexos**
- A. Manual de instalación
- B. Manual de usuario
- C. Referencia de la API (OpenAPI)
- D. Diccionario de datos

**Bibliografía**

---
