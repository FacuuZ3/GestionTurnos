# ============================================================================
# Dockerfile - Backend NestJS
# ----------------------------------------------------------------------------
# Construcción multi-stage para minimizar el tamaño final de la imagen.
#
# REFERENCIA INFORME - Capítulo 5: Implementación
# Sección: Containerización
# Diagrama relacionado: Diagrama de Despliegue
# Descripción académica: La imagen Docker resultante contiene únicamente las
#   dependencias de producción y los artefactos compilados, ajustándose a las
#   buenas prácticas de seguridad y rendimiento.
# ============================================================================

# --- Etapa 1: build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Etapa 2: producción ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3001
CMD ["node", "dist/main.js"]
