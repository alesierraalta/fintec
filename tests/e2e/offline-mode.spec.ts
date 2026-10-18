import { expect, test } from '@playwright/test';

test.describe('Offline Mode Resilience', () => {
  test('preserves loaded BCV rates across a network disconnect', async ({
    page,
    context,
  }) => {
    await page.route('**/api/bcv-rates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            usd: 123.45,
            eur: 134.56,
            lastUpdated: '2025-01-01T00:00:00.000Z',
            source: 'BCV',
          },
          cached: false,
          cacheAge: 0,
          fallback: false,
        }),
      });
    });

    await page.goto('/');

    const ratesSection = page.locator('#tasas-en-vivo');
    const connectionStatus = ratesSection.getByRole('status', {
      name: 'Estado de conexión',
    });
    const usdRate = ratesSection.getByText('Bs. 123.45', { exact: true });

    await ratesSection.scrollIntoViewIfNeeded();
    await expect(
      ratesSection.getByRole('heading', { name: 'Tasas de referencia' })
    ).toBeVisible();
    await expect(connectionStatus).toHaveText('Conectado');
    await expect(usdRate).toBeVisible();

    await context.setOffline(true);

    await expect(connectionStatus).toHaveText('Desconectado');
    await expect(usdRate).toBeVisible();

    await context.setOffline(false);
    await expect(connectionStatus).toHaveText('Conectado');
  });
});
