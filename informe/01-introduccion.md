# Capítulo 1 — Introducción

## 1.1 Contexto del proyecto

El pádel se ha consolidado en los últimos años como uno de los deportes de
mayor crecimiento en Argentina, particularmente en ciudades de tamaño
intermedio como Reconquista, Santa Fe. La proliferación de complejos
deportivos privados, sumada al carácter social y recreativo del deporte —que
requiere la coordinación de cuatro jugadores y un horario fijo de 90
minutos—, plantea un desafío operativo permanente para los administradores
de canchas: gestionar de manera eficiente una agenda fragmentada, evitar
solapamientos, ofrecer disponibilidad clara a los clientes y mantener un
registro fiable de la actividad del complejo.

En el contexto local, la mayoría de los complejos deportivos resuelven la
gestión de turnos mediante mecanismos artesanales: planillas en papel,
mensajes de WhatsApp dirigidos a un administrador, llamadas telefónicas o,
en el mejor de los casos, hojas de cálculo compartidas. Estos mecanismos son
funcionales en escalas pequeñas, pero presentan limitaciones importantes a
medida que crece la demanda: respuesta no inmediata, riesgo de doble reserva
del mismo horario, ausencia de auditoría de cambios y carga operativa
desproporcionada sobre el personal del complejo.

El presente trabajo final aborda esta problemática desde la perspectiva de
la Tecnicatura Universitaria en Programación, proponiendo el desarrollo
integral de un sistema web que automatice y trace todo el ciclo de gestión
de turnos, desde la consulta pública de disponibilidad hasta el registro de
acciones administrativas.

## 1.2 Planteamiento del problema

Los complejos deportivos de pádel que operan con mecanismos manuales de
reserva enfrentan, de manera recurrente, los siguientes problemas:

**P1. Riesgo de doble reserva.** Cuando un cliente reserva por WhatsApp o
teléfono mientras otro lo hace en simultáneo por un canal diferente (otra
persona del personal, una hoja en papel, etc.), el sistema artesanal carece
de mecanismos de bloqueo y puede aceptar dos reservas para el mismo horario.
La resolución del conflicto recae sobre el cliente y deteriora la confianza
en el servicio.

**P2. Indisponibilidad horaria.** El personal del complejo sólo puede
recibir reservas durante el horario laboral del local. Un cliente que decide
a las 23:00 jugar al día siguiente debe esperar al día siguiente para llamar
o pasar por el complejo, perdiendo la oportunidad si otro cliente lo
solicita primero por la mañana.

**P3. Falta de visibilidad de disponibilidad.** El cliente no puede consultar
de manera autónoma qué horarios están libres; depende de preguntar al
personal, que a su vez debe consultar la planilla u hoja de cálculo y
responder manualmente.

**P4. Ausencia de trazabilidad.** Cuando una reserva se modifica o cancela,
no queda registro del responsable, el motivo o el momento del cambio. Esto
genera disputas y dificulta la mejora operativa.

**P5. Imposibilidad de análisis.** Sin datos estructurados, el
administrador no puede responder preguntas básicas como cuáles son los
horarios de mayor demanda, qué cancha factura más o qué clientes son
recurrentes.

**P6. Olvidos de turno.** Sin un sistema de recordatorios automáticos, una
proporción no menor de turnos quedan vacíos porque el cliente olvida la
reserva, lo que representa una pérdida directa de ingresos para el complejo.

## 1.3 Objetivos

### Objetivo general

Diseñar, implementar y documentar un sistema web full-stack que permita a
clientes y administradores de complejos deportivos de pádel gestionar
reservas de turnos en línea, con garantías de consistencia, trazabilidad y
una experiencia de usuario adecuada a estándares contemporáneos.

### Objetivos específicos

1. **OE1.** Modelar el dominio de reservas de turnos en una base de datos
   relacional, identificando entidades, relaciones, restricciones de
   integridad e índices que soporten consultas eficientes de
   disponibilidad.

2. **OE2.** Desarrollar una API REST autenticada con autorización por roles
   (cliente y administrador) que exponga los casos de uso del sistema y
   esté documentada de manera interactiva.

3. **OE3.** Garantizar la unicidad de la reserva por cancha y rango horario
   mediante mecanismos de concurrencia robustos a nivel de base de datos,
   demostrablemente correctos en escenarios de creación simultánea.

4. **OE4.** Implementar una interfaz web responsiva, accesible y con soporte
   de modo claro/oscuro, que permita a los clientes consultar
   disponibilidad, reservar, cancelar y gestionar su perfil; y a los
   administradores, operar el complejo en su totalidad.

5. **OE5.** Codificar las reglas de negocio del dominio (anticipación
   mínima y máxima, plazo de cancelación, cupo por usuario) de manera
   centralizada y documentada, exentas únicamente para administradores.

6. **OE6.** Incorporar un subsistema de notificaciones por correo
   electrónico para la confirmación de cuenta, confirmación de reserva,
   cancelación, recordatorio y reseteo de contraseña.

7. **OE7.** Proveer al administrador un dashboard estadístico con métricas
   operativas (ocupación, facturación estimada, top de clientes, mapa de
   calor de horarios populares) y un registro inmutable de auditoría de
   acciones administrativas.

8. **OE8.** Verificar la corrección del sistema mediante tests unitarios
   sobre la lógica transaccional crítica y tests *end-to-end* sobre los
   flujos principales, integrados a un pipeline de integración continua.

## 1.4 Alcance

### Funcionalidades incluidas

El sistema entregado cubre las siguientes funcionalidades:

**Para el cliente:**
- Registro de cuenta con verificación de email por token.
- Inicio de sesión con JWT (access + refresh tokens).
- Recuperación de contraseña vía email.
- Edición del perfil personal y cambio de contraseña.
- Consulta pública de canchas disponibles en el complejo.
- Consulta de disponibilidad por cancha y fecha (slots de 90 minutos).
- Creación de reserva con confirmación automática.
- Visualización de reservas próximas e historial.
- Cancelación de reservas propias.
- Recepción de email de confirmación de reserva y recordatorio
  veinticuatro horas antes del turno.

**Para el administrador:**
- Todas las funcionalidades del cliente más las siguientes.
- Gestión completa de canchas (alta, edición, suspensión, eliminación
  definitiva).
- Visualización tipo *Gantt* horizontal de la agenda diaria con todas las
  canchas en filas.
- Creación de reservas a nombre propio sin restricciones de anticipación
  ni cupo.
- Reprogramación y cancelación de cualquier reserva.
- Creación, edición y baja de turnos fijos semanales (bloqueos
  recurrentes).
- Dashboard estadístico con métricas configurables por rango temporal.
- Edición de la información institucional del complejo (dirección, mapa,
  horarios y servicios).
- Consulta del registro de auditoría de acciones administrativas.

### Funcionalidades fuera del alcance

Se documentan como trabajo futuro las siguientes capacidades, que no
fueron incluidas para mantener el proyecto en una escala adecuada al
trabajo final:

- Integración con pasarela de pagos en línea. El modelo de negocio
  relevado en la ciudad supone el pago en el complejo al momento de jugar.
- Notificaciones por WhatsApp. El subsistema de notificaciones expone una
  interfaz `INotificationChannel` preparada para que un futuro
  `WhatsAppChannel` se integre sin modificar el código existente.
- Gestión de torneos, profesores y clases con membresías.
- Aplicación móvil nativa.
- Sistema de lista de espera (*waitlist*).

## 1.5 Justificación

El proyecto se justifica desde tres dimensiones complementarias.

**Dimensión académica.** Los contenidos abordados durante la Tecnicatura
Universitaria en Programación —diseño de bases de datos relacionales,
programación orientada a objetos, principios SOLID, desarrollo web,
arquitectura de software y verificación de calidad— se integran en un
producto coherente y verificable. El trabajo demuestra la capacidad del
alumno para tomar decisiones técnicas fundamentadas, aplicar patrones de
diseño en escenarios reales y entregar software con calidad documentada.

**Dimensión técnica.** El sistema enfrenta problemas no triviales propios
de las aplicaciones reales: control de concurrencia transaccional, manejo
de zonas horarias, autenticación segura, autorización basada en roles,
procesamiento asíncrono mediante eventos y *cron jobs*, y observabilidad
en producción. Cada uno de estos desafíos requiere conocer no sólo la
sintaxis de las tecnologías involucradas sino el por qué de sus
mecanismos.

**Dimensión social.** El sistema responde a una necesidad concreta del
contexto local. Los complejos de pádel de la región operan, en su mayoría,
con mecanismos manuales que limitan la calidad del servicio y la
posibilidad de crecimiento. El software desarrollado, al ser de uso libre
para los fines del trabajo final, podría ser adoptado por estos complejos
con un costo de implementación marginal.

## 1.6 Estructura del documento

El presente informe está estructurado en siete capítulos principales más
anexos.

El **Capítulo 2 (Marco Teórico)** desarrolla los conceptos técnicos
necesarios para comprender las decisiones del proyecto: arquitectura
cliente-servidor, REST, frameworks NestJS y Next.js, mapeo
objeto-relacional, autenticación con JSON Web Tokens, niveles de
aislamiento transaccional, y principios SOLID con los patrones de diseño
aplicados.

El **Capítulo 3 (Análisis del Sistema)** identifica los actores del
sistema (cliente y administrador), enumera los requerimientos funcionales
y no funcionales, y modela los casos de uso principales.

El **Capítulo 4 (Diseño del Sistema)** presenta la arquitectura general
del sistema, el modelo de datos formalizado en un Diagrama
Entidad-Relación, el diagrama de clases del dominio, los subsistemas
identificados y las reglas de negocio codificadas.

El **Capítulo 5 (Implementación)** documenta el stack tecnológico
adoptado, la estructura del repositorio, y los detalles de implementación
de cada subsistema, con especial énfasis en el control de concurrencia
del subsistema de reservas (sección 5.4), que constituye el aporte
técnico más significativo del trabajo.

El **Capítulo 6 (Verificación y Validación)** describe la estrategia de
testing aplicada, los tests unitarios sobre la lógica crítica, los tests
*end-to-end* con Playwright y el pipeline de integración continua.

El **Capítulo 7 (Conclusiones y Trabajo Futuro)** reflexiona sobre los
objetivos alcanzados, los aprendizajes obtenidos durante el desarrollo y
las posibles líneas de continuación del proyecto.

Los **Anexos** incluyen el manual de instalación del sistema, el manual
de uso para clientes y administradores, la referencia completa de la API
generada a partir de la especificación OpenAPI, y el diccionario de
datos.

---
