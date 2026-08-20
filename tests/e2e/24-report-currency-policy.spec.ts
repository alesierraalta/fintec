import { expect, test } from '@playwright/test';

// Guarded no-auth lane (FRONTEND_AUTH_BYPASS=1): the reports page renders a stub
// user with no data, so the KPI cards must disclose the honest "Sin datos"
// state instead of a fabricated 0,00. Run via:
//   npm run e2e:no-auth -- tests/e2e/24-report-currency-policy.spec.ts
test.describe('Reports Currency Display Policy (WU58) @no-auth', () => {
  test('discloses an honest unavailable state instead of 0,00 in KPI cards', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    await page.goto('/reports');
    // Reports page renders a loading state initially; wait for the real content.
    await expect(page).toHaveURL(/\/reports/);
    await expect(
      page.getByRole('heading', { name: /Reportes/i })
    ).toBeVisible({ timeout: 15000 });
    // Ensure loading placeholder is gone before inspecting KPI cards.
    await expect(page.getByText('Cargando reportes')).toBeHidden({
      timeout: 15000,
    });

    // Each KPI card (Ingresos / Gastos / Balance Neto) must disclose "Sin datos".
    const incomeCard = page.locator('div.rounded-2xl', {
      has: page.getByText('Ingresos', { exact: true }),
    });
    await expect(incomeCard).toBeVisible({ timeout: 10000 });
    await expect(incomeCard.getByText('Sin datos')).toBeVisible();

    const expenseCard = page.locator('div.rounded-2xl', {
      has: page.getByText('Gastos', { exact: true }),
    });
    await expect(expenseCard.getByText('Sin datos')).toBeVisible();

    // The income KPI card must NOT present a fabricated zero total.
    await expect(incomeCard).not.toContainText('0,00');
  });
});
