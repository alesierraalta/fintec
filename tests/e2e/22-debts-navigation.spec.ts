import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { bootstrapCanonicalFixtures } from '@/tests/support/auth/bootstrap';

async function postTransaction(page: Page, payload: Record<string, unknown>) {
  const response = await page.request.post('/api/transactions', {
    data: payload,
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Debts Navigation and Totals @auth-required', () => {
  test('opens /debts and reflects zero + mixed OPEN/SETTLED behavior', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    await page.goto('/');
    await page
      .getByRole('link', { name: /Deudas/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/debts/);
    await expect(page.getByText('Deudas')).toBeVisible();

    await page.locator('input[type="date"]').first().fill('2100-01-01');
    await page.locator('input[type="date"]').nth(1).fill('2100-01-01');
    await expect(
      page.getByText('No hay deudas para este filtro.')
    ).toBeVisible();

    const { account, incomeCategory, expenseCategory } =
      await bootstrapCanonicalFixtures(page);
    const token = Date.now().toString();
    const mixedDate = '2099-03-01';
    const openDescription = `E2E deuda abierta ${token}`;
    const settledDescription = `E2E deuda saldada ${token}`;

    await postTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 7777,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date: mixedDate,
      description: openDescription,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'OPEN',
    });

    await postTransaction(page, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: 9900,
      currencyCode: account.currencyCode,
      type: 'INCOME',
      date: mixedDate,
      description: settledDescription,
      isDebt: true,
      debtDirection: 'OWED_TO_ME',
      debtStatus: 'SETTLED',
      settledAt: mixedDate,
    });

    await page.locator('input[type="date"]').first().fill(mixedDate);
    await page.locator('input[type="date"]').nth(1).fill(mixedDate);
    await page.locator('select').first().selectOption('ALL');
    await page.locator('select').nth(1).selectOption('ALL');

    await expect(page.getByText(openDescription)).toBeVisible();
    await expect(page.getByText(settledDescription)).toBeVisible();
    await expect(page.getByText('Saldada')).toBeVisible();
    await expect(page.getByText('Abierta')).toBeVisible();
  });
});
