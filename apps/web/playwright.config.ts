/**
 * Playwright Configuration
 * ---------------------------------------------------------------------------
 * Tests end-to-end ejecutados contra los servidores de desarrollo.
 *
 * Pre-requisitos:
 *   1. Postgres corriendo (docker compose up -d postgres).
 *   2. Backend levantado en :3001 (npm run start:dev en apps/api).
 *   3. Frontend levantado en :3000 (npm run dev en apps/web).
 *
 * Para correr:
 *     npm run test:e2e           # headless
 *     npm run test:e2e:ui        # con visualizador interactivo
 *
 * REFERENCIA INFORME - Capítulo 6: Verificación y Validación
 * Sección: Tests end-to-end
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // los tests comparten DB; los corremos serializados
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
