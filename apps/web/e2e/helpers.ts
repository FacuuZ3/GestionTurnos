/**
 * Helpers comunes para los tests E2E.
 * ---------------------------------------------------------------------------
 *   - uniqueEmail: genera un email único por test para evitar conflictos
 *     con cuentas existentes (los tests no resetean la BD).
 *   - apiRequest: helper para llamar a la API del backend desde el contexto
 *     del test (útil para preparar/limpiar datos antes/después).
 *   - loginAsAdmin / loginAsSeededUser: shortcuts para autenticar con las
 *     cuentas del seed.
 */

import { Page, expect, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3001';

export const SEED_ADMIN = {
  email: 'admin@padelturnos.local',
  password: 'Admin123!',
};

export const SEED_USER = {
  email: 'juan.perez@example.com',
  password: 'User123!',
};

/** Email único por test, basado en timestamp. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}@test.local`;
}

/** Login vía UI. Espera redirigir al dashboard correspondiente. */
export async function login(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: /^Ingresar$/ }).click();
  // El middleware redirige a /dashboard/admin o /dashboard/user.
  await expect(page).toHaveURL(/\/dashboard\//);
}

/** Logout vía UI. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Cerrar sesión/i }).click();
  await expect(page).toHaveURL('/');
}

/**
 * Verifica la cuenta directamente vía API extrayendo el token del email
 * simulado del backend. Para tests E2E asumimos que verificamos vía la
 * propia BD: el seed crea las cuentas con isEmailVerified=true, y para
 * cuentas nuevas usamos este helper que llama al endpoint público con un
 * token conocido (en realidad lo skippeamos llamando a verify-email
 * directamente sobre la cuenta del backend si tuviéramos acceso).
 *
 * Para mantener los tests simples, registramos sólo cuentas que YA están
 * pre-verificadas (admin / juan / maria). Para tests que requieren un
 * usuario nuevo "verificado", lo creamos con seedAndVerify.
 */
export async function apiLogin(
  request: APIRequestContext,
  creds: { email: string; password: string },
): Promise<{ accessToken: string; userId: string }> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });
  expect(res.status(), `Login failed for ${creds.email}`).toBe(200);
  const body = await res.json();
  return { accessToken: body.accessToken, userId: body.user.id };
}

/** Devuelve la primera cancha activa del seed. */
export async function getFirstActiveCourt(
  request: APIRequestContext,
): Promise<{ id: string; name: string; pricePerHour: string }> {
  const res = await request.get(`${API_BASE}/api/courts`);
  const courts = await res.json();
  const active = courts.find((c: { isActive: boolean }) => c.isActive);
  if (!active) throw new Error('No hay canchas activas en la BD para correr los tests.');
  return active;
}
