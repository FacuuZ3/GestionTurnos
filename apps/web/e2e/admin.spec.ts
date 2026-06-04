/**
 * E2E: Panel administrativo
 * ---------------------------------------------------------------------------
 * Cubre:
 *   - Login como admin → redirige al panel admin.
 *   - Las 6 pestañas son accesibles (Reservas, Canchas, Turnos fijos,
 *     Estadísticas, Club, Auditoría).
 *   - El admin puede ver la timeline y las acciones rápidas.
 *
 * REFERENCIA INFORME - Capítulo 6: Verificación y Validación
 * Sección: E2E - Subsistema administrativo
 */

import { test, expect } from '@playwright/test';
import { login, logout, SEED_ADMIN } from './helpers';

test.describe('Admin', () => {
  test('login como admin lleva al panel administrativo', async ({ page }) => {
    await login(page, SEED_ADMIN);
    await expect(page).toHaveURL(/\/dashboard\/admin/);
    await expect(page.getByRole('heading', { name: /Calendario operativo/i })).toBeVisible();
  });

  test('todas las pestañas del admin son accesibles', async ({ page }) => {
    await login(page, SEED_ADMIN);

    const tabs = [
      { name: 'Canchas', heading: /Canchas/i },
      { name: 'Turnos fijos', heading: /Turnos fijos/i },
      { name: 'Estadísticas', heading: /Reservas confirmadas|Facturación/i },
      { name: 'Club', heading: /Ubicación/i },
      { name: 'Auditoría', heading: /Auditoría/i },
    ];

    for (const t of tabs) {
      await page.getByRole('link', { name: t.name }).click();
      await expect(page.getByText(t.heading).first()).toBeVisible({ timeout: 10_000 });
    }

    // Volver a Reservas
    await page.getByRole('link', { name: 'Reservas' }).click();
    await expect(page.getByRole('heading', { name: /Calendario operativo/i })).toBeVisible();
  });

  test('el admin ve la timeline con canchas', async ({ page }) => {
    await login(page, SEED_ADMIN);

    // Las filas de canchas (sidebar 220px) deben renderizarse.
    await expect(page.getByText(/Cancha/i).first()).toBeVisible({ timeout: 10_000 });

    // La leyenda del calendario aparece debajo.
    await expect(page.getByText('No disponible')).toBeVisible();
    await expect(page.getByText('Tu reserva')).toBeVisible();

    await logout(page);
  });

  test('un USER no puede acceder a rutas /dashboard/admin', async ({ page, request }) => {
    // Login como usuario común vía UI
    const { SEED_USER } = await import('./helpers');
    await login(page, SEED_USER);

    // Intentar ir directamente al admin
    await page.goto('/dashboard/admin');
    // El middleware redirige a /dashboard/user porque el rol no es ADMIN.
    await expect(page).toHaveURL(/\/dashboard\/user/);

    // Sanity: el endpoint admin desde la API también responde 403.
    const res = await request.post('http://localhost:3001/api/courts', {
      data: { name: 'X', sportType: 'PADEL', pricePerHour: 1000 },
    });
    expect([401, 403]).toContain(res.status());
  });
});
