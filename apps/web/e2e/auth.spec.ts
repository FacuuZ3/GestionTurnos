/**
 * E2E: Autenticación
 * ---------------------------------------------------------------------------
 * Cubre el flujo público de:
 *   - Acceso a la landing (no requiere sesión).
 *   - Registro con email único.
 *   - Login de cuenta pre-verificada (seed).
 *   - Logout.
 *
 * REFERENCIA INFORME - Capítulo 6: Verificación y Validación
 * Sección: E2E - Subsistema de autenticación
 */

import { test, expect } from '@playwright/test';
import { login, logout, SEED_USER, uniqueEmail } from './helpers';

test.describe('Autenticación', () => {
  test('la landing carga y muestra el CTA principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Tu cancha/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Crear cuenta/i }).first()).toBeVisible();
  });

  test('un usuario nuevo se puede registrar con email único', async ({ page }) => {
    const email = uniqueEmail('register');

    await page.goto('/register');
    await page.getByLabel('Nombre y apellido').fill('Test User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill('Password123!');
    await page.getByRole('button', { name: /Crear cuenta/i }).click();

    // Mensaje de éxito tras el alta (cuenta sin verificar todavía).
    await expect(page.getByText(/revisá tu email/i)).toBeVisible({ timeout: 10_000 });
  });

  test('un usuario verificado puede loguearse y desloguearse', async ({ page }) => {
    // Usa la cuenta del seed que ya viene con isEmailVerified=true.
    await login(page, SEED_USER);

    // En el dashboard del usuario aparece "Mis reservas".
    await expect(page).toHaveURL(/\/dashboard\/user/);
    await expect(page.getByRole('heading', { name: /Hola,/i })).toBeVisible();

    // Logout
    await logout(page);
    await expect(page.getByRole('link', { name: /Ingresar/i }).first()).toBeVisible();
  });

  test('credenciales inválidas muestran error sin filtrar info', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('no.existe@nada.local');
    await page.getByLabel('Contraseña').fill('algo-incorrecto');
    await page.getByRole('button', { name: /^Ingresar$/ }).click();

    // El error es genérico para no permitir enumeración de cuentas.
    await expect(page.getByText(/Credenciales inválidas/i)).toBeVisible();
  });
});
