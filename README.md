# Sistema Integral de Gestión y Reserva de Turnos para Complejos Deportivos de Pádel

[![CI](https://github.com/USUARIO/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USUARIO/REPO/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![Postgres](https://img.shields.io/badge/Postgres-16-336791?logo=postgresql&logoColor=white)

Proyecto Final - Tecnicatura Universitaria en Programación (TUP)
UTN Facultad Regional Reconquista

## Descripción

Plataforma web full-stack para la gestión integral de reservas en complejos
deportivos de pádel, que provee:

- Registro y autenticación de usuarios con verificación por email.
- Visualización de canchas disponibles y reserva de turnos en línea.
- Panel administrativo para la gestión de canchas, turnos y disponibilidad.
- Notificaciones automáticas por email (preparado para WhatsApp).
- Control de concurrencia transaccional para evitar reservas duplicadas.

## Arquitectura

Monorepo con la siguiente estructura:

```
padel-turnos/
├── apps/
│   ├── api/   ← Backend NestJS + Prisma + PostgreSQL
│   └── web/   ← Frontend Next.js 14 (App Router)
├── docker-compose.yml
└── README.md
```

Cada subproyecto mantiene independencia de despliegue pero comparte
versionado y configuración común.

## Stack tecnológico

| Capa            | Tecnología                                              |
| --------------- | ------------------------------------------------------- |
| Frontend        | Next.js 14, TypeScript, Tailwind, shadcn/ui             |
| Estado servidor | TanStack Query                                          |
| Formularios     | React Hook Form + Zod                                   |
| Calendario      | react-big-calendar                                      |
| Backend         | NestJS, TypeScript, Passport JWT                        |
| ORM             | Prisma                                                  |
| Base de datos   | PostgreSQL                                              |
| Notificaciones  | Nodemailer (email), interfaz preparada para WhatsApp    |
| Infraestructura | Docker + docker-compose                                 |

## Puesta en marcha (desarrollo)

```bash
# 1. Clonar repositorio y crear variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 2. Levantar PostgreSQL
docker compose up -d postgres

# 3. Instalar dependencias e inicializar la base
cd apps/api && npm install && npx prisma migrate dev && npm run seed
cd ../web && npm install

# 4. Arrancar ambos servicios en terminales separadas
cd apps/api && npm run start:dev
cd apps/web && npm run dev
```

API disponible en `http://localhost:3001` y frontend en `http://localhost:3000`.

## Referencia académica

Este código fue diseñado para ser citado y documentado en el Informe Final.
Cada módulo incluye un bloque de comentario `REFERENCIA INFORME` indicando
el capítulo, sección y diagrama UML asociado.
