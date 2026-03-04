import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function getSeedData(page: Page) {
  const [accountsResponse, categoriesResponse] = await Promise.all([
    page.request.get('/api/accounts?active=true'),
    page.request.get('/api/categories'),
  ]);

  expect(accountsResponse.ok()).toBeTruthy();
  expect(categoriesResponse.ok()).toBeTruthy();

  const accounts = (await accountsResponse.json()).data || [];
  const categories = (await categoriesResponse.json()).data || [];

  return {
    account: accounts[0],
    incomeCategory: categories.find(
      (category: any) => category.kind === 'INCOME'
    ),
    expenseCategory: categories.find(
      (category: any) => category.kind === 'EXPENSE'
    ),
  };
}

async function createTransaction(page: Page, payload: Record<string, unknown>) {
  const response = await page.request.post('/api/transactions', {
    data: payload,
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Reports Period Selector Boundaries', () => {
  test('keeps operational KPI separate from debt portfolio totals', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, incomeCategory, expenseCategory } =
      await getSeedData(page);
    test.skip(
      !account || !incomeCategory || !expenseCategory,
      'Missing seed account/category data for test user'
    );

    const token = Date.now().toString();
    const testDate = '2099-02-01';
    const debtDescription = `E2E deuda reporte ${token}`;

    await createTransaction(page, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: 10000,
      currencyCode: account.currencyCode,
      type: 'INCOME',
      date: testDate,
      description: `E2E ingreso operativo ${token}`,
      isDebt: false,
    });

    await createTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 3000,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date: testDate,
      description: `E2E gasto operativo ${token}`,
      isDebt: false,
    });

    await createTransaction(page, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: 8500,
      currencyCode: account.currencyCode,
      type: 'INCOME',
      date: testDate,
      description: debtDescription,
      isDebt: true,
      debtDirection: 'OWED_TO_ME',
      debtStatus: 'OPEN',
    });

    await page.goto('/reports');
    await page.getByRole('button', { name: /Personalizado/i }).click();

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(testDate);
    await dateInputs.nth(1).fill(testDate);

    await expect(page.getByText('Cartera de deudas')).toBeVisible();
    await expect(page.getByText('Cuanto me deben')).toBeVisible();
    await expect(page.getByText('Cuanto debo')).toBeVisible();
    await expect(page.getByText('deudas abiertas')).toBeVisible();
  });
});
