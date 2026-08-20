import { expect, test } from '@playwright/test';

test.describe('Recurring persistence @auth-required', () => {
  test('creates a rule from the real page and exposes the explicit first-operation choice', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop project only');
    const name = `E2E recurring ${Date.now()}`;
    await page.goto('/recurring', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Nueva Recurrente' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva transaccion recurrente' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Registrar la primera operacion ahora' })).toBeVisible();
    await page.getByLabel('Nombre').fill(name);
    await page.getByLabel('Monto').fill('12.50');
    const account = page.getByLabel('Cuenta');
    await expect(account).toBeEnabled();
    await account.selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Crear regla recurrente' }).click();
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText('Regla recurrente guardada correctamente')).toBeVisible();
  });
});
