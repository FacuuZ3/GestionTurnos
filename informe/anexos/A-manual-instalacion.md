# Anexo A — Manual de Instalación

Este anexo documenta el procedimiento para instalar y ejecutar el sistema
Pádel Turnos en un entorno de desarrollo local. El instructivo está
pensado para sistemas operativos Windows 10/11 con PowerShell. La
adaptación a macOS o Linux es directa: reemplazar los comandos de
PowerShell por sus equivalentes en bash.

## A.1 Requisitos previos

| Herramienta | Versión mínima | Verificación |
|---|---|---|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x | `npm --version` |
| Docker Desktop | 4.x con WSL2 | `docker --version` |
| Git | cualquiera | `git --version` |

Docker Desktop debe estar **en ejecución** durante la instalación y el
uso del sistema (en Windows, el ícono de la ballena debe aparecer
estático en la barra de tareas).

## A.2 Procedimiento de instalación

### A.2.1 Clonar el repositorio

```powershell
git clone https://github.com/USUARIO/padel-turnos.git
cd padel-turnos
```

### A.2.2 Configurar las variables de entorno

El sistema utiliza dos archivos `.env` separados (uno por subproyecto).
Existen plantillas `.env.example` con los valores de ejemplo:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.local.example apps\web\.env.local
```

En `apps\api\.env` reemplazar los secretos JWT (`JWT_ACCESS_SECRET` y
`JWT_REFRESH_SECRET`) por cadenas aleatorias de al menos 32 caracteres.
PowerShell ofrece una manera simple de generarlos:

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

El comando produce una cadena de 64 caracteres alfanuméricos. Ejecutar
dos veces y reemplazar los valores correspondientes en el archivo. El
resto de las variables (DATABASE_URL, MAIL_HOST, etc.) puede dejarse
con los defaults para entorno local.

### A.2.3 Levantar PostgreSQL

```powershell
docker compose up -d postgres
```

Verificar que el contenedor esté activo y saludable:

```powershell
docker compose ps
```

Debe aparecer `padel_postgres` con `STATUS: Up X seconds (healthy)`.

### A.2.4 Instalar dependencias del backend

```powershell
cd apps\api
npm install
```

La operación tarda de uno a tres minutos en la primera ejecución.

### A.2.5 Aplicar el schema de base de datos

```powershell
npx prisma generate
npx prisma migrate dev --name init
```

El segundo comando crea todas las tablas, índices y constraints según
el archivo `schema.prisma`. La primera ejecución puede pedir
confirmación; responder afirmativamente.

### A.2.6 Cargar datos de prueba (seed)

```powershell
npm run seed
```

El script crea un administrador, dos usuarios estándar, dos canchas,
tres reservas y la información institucional del club. Las credenciales
de las cuentas creadas son:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@padelturnos.local` | `Admin123!` | ADMIN |
| `juan.perez@example.com` | `User123!` | USER |
| `maria.gomez@example.com` | `User123!` | USER |

### A.2.7 Iniciar el backend

```powershell
npm run start:dev
```

El servidor debe arrancar y mostrar en consola:

```
[Bootstrap] API escuchando en http://localhost:3001/api
[Bootstrap] Swagger UI disponible en http://localhost:3001/api/docs
```

Esta terminal debe permanecer abierta durante el uso del sistema.

### A.2.8 Instalar dependencias del frontend

En una **segunda terminal**, también ubicada en la raíz del repositorio:

```powershell
cd apps\web
npm install
```

### A.2.9 Iniciar el frontend

```powershell
npm run dev
```

Esperar el mensaje `✓ Ready in X s`. La terminal debe permanecer
abierta.

### A.2.10 Acceder al sistema

Abrir el navegador en:

- **Aplicación web**: `http://localhost:3000`
- **Documentación de la API**: `http://localhost:3001/api/docs`

## A.3 Comandos de uso frecuente

### A.3.1 Iniciar el sistema en sesiones posteriores

Después de la instalación inicial, en cada sesión basta con:

```powershell
# Terminal 1
docker compose up -d postgres
cd apps\api
npm run start:dev

# Terminal 2
cd apps\web
npm run dev
```

### A.3.2 Detener el sistema

En cada terminal presionar `Ctrl + C`. Luego, opcionalmente:

```powershell
docker compose down
```

Los datos quedan persistidos en el volumen `padel_pgdata` de Docker.

### A.3.3 Reiniciar la base de datos con datos limpios

```powershell
cd apps\api
npx prisma migrate reset
```

El comando borra todas las tablas y vuelve a aplicar las migraciones
junto con el seed.

### A.3.4 Ejecutar los tests

```powershell
# Tests unitarios (backend)
cd apps\api
npm test

# Tests E2E (frontend, requiere backend y frontend corriendo)
cd apps\web
npm run test:e2e:install   # sólo la primera vez
npm run test:e2e
```

## A.4 Solución de problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `ECONNREFUSED 5432` al arrancar el backend | Postgres no está corriendo | `docker compose up -d postgres` |
| `Environment variable not found: DATABASE_URL` | Falta el archivo `.env` | Repetir A.2.2 |
| `Validation failed: JWT_ACCESS_SECRET length must be at least 32` | Secretos del `.env` demasiado cortos | Volver a A.2.2 y regenerar |
| `Port 3001 is already in use` | Otro proceso ocupa el puerto | Cerrar la otra aplicación o cambiar `PORT` en `.env` |
| `Cannot find module '@nestjs/...'` | Falta correr `npm install` | Ejecutar `npm install` en el subproyecto correspondiente |
| `Property 'X' does not exist on type 'PrismaService'` | Cliente Prisma desactualizado | Ejecutar `npx prisma generate` |
| El frontend muestra "Network Error" | El backend no responde | Verificar la terminal del backend |

---
