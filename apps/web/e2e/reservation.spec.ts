/**
 * E2E: Flujo de reserva del usuario
 * ---------------------------------------------------------------------------
 * Cubre:
 *   - Ver "Mis reservas" sin turnos próximos.
 *   - Ir a /dashboard/user/reservar y ver la timeline.
 *   - Cancelar una reserva (creada previamente vía API para no depender de
 *     la disponibilidad real del día).
 *
 * Nota académica: la creación de reserva vía UI depende de que haya slots
 * disponibles en horarios futuros. Para evitar flakiness se usa la API
 * para preparar el estado y se testea el comportamiento UI sobre datos
 * conocidos.
 *
 * REFERENCIA INFORME - Capítulo 6: Verificación y Validación
 * Sección: E2E - Subsistema de reservas
 */

import { test, expect } from '@playwright/test';
import {
  apiLogin,
  getFirstActiveCourt,
  login,
  SEED_USER,
} from './helpers';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3001';

test.describe('Reservas (usuario)', () => {
  test('navega de Mis reservas a Reservar y vuelve', async ({ page }) => {
    await login(page, SEED_USER);

    await expect(page).toHaveURL(/\/dashboard\/user/);
    await page.getByRole('link', { name: /^Reservar$/ }).click();

    await expect(page).toHaveURL(/\/dashboard\/user\/reservar/);
    await expect(page.getByRole('heading', { name: /Elegí tu turno/i })).toBeVisible();

    // Volver con el link "← Volver a Mis reservas"
    await page.getByRole('link', { name: /Volver a Mis reservas/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/user$/);
  });

  test('crea una reserva vía API y la cancela desde la UI', async ({ page, request }) => {
    // 1. Preparar: login API + crear reserva para mañana a horario operativo.
    const { accessToken, userId } = await apiLogin(request, SEED_USER);
    const court = await getFirstActiveCourt(request);

    const start = new Date();
    start.setDate(start.getDate() + 2); // pasado mañana — evita conflicto con anticipación mínima
    start.setHours(20, 30, 0, 0);
    const end = new Date(start.getTime() + 90 * 60 * 1000);

    const created = await request.post(`${API_BASE}/api/reservations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        courtId: court.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    expect(
      [200, 201, 409].includes(created.status()),
      `Esperaba 201 o 409 (slot ya tomado), recibí ${created.status()}`,
    ).toBeTruthy();

    // Si el slot ya estaba tomado por otro test, no podemos seguir.
    test.skip(
      created.status() === 409,
      'El slot 20:30 ya estaba reservado — corré los tests con BD limpia',
    );

    void userId; // suprimir warning de unused; sólo lo capturamos para claridad

    // 2. Login vía UI y verificar que la reserva aparece como "Próxima reserva"
    await login(page, SEED_USER);
    await expect(
      page.getByRole('heading', { name: court.name, exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    // 3. Cancelar la reserva
    await page.getByRole('button', { name: /Cancelar reserva/i }).first().click();

    // 4. Verificar que ya no aparece como próxima (debería mostrar empty state)
    await expect(page.getByText(/No tenés ningún turno reservado|otras próximas/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
