import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
async function transactionCount(page: Page): Promise<number> {
  const response = await page.request.get('/api/transactions');
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { data: { count: number } }).data.count;
}
test.describe('Canonical Transfer Flow @auth-required', () => {
  test('generic Transfer selection opens /transfers and persists nothing', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop project only');
    const countBefore = await transactionCount(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Registrar Gasto' }).click();
    await page.getByRole('button', { name: 'Transferencia' }).click();
    await expect(page).toHaveURL(/\/transfers/);
    await page.goto('/transactions/add');
    await page.getByRole('button', { name: 'Transferencia' }).click();
    await expect(page).toHaveURL(/\/transfers/);
    // No lone TRANSFER_OUT row was persisted by either caller.
    expect(await transactionCount(page)).toBe(countBefore);
  });
});
