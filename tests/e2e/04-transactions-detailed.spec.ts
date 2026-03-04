import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function fetchSeedData(page: Page) {
  const [accountsResponse, categoriesResponse] = await Promise.all([
    page.request.get('/api/accounts?active=true'),
    page.request.get('/api/categories'),
  ]);

  expect(accountsResponse.ok()).toBeTruthy();
  expect(categoriesResponse.ok()).toBeTruthy();

  const accountsPayload = await accountsResponse.json();
  const categoriesPayload = await categoriesResponse.json();

  const account = (accountsPayload.data || [])[0];
  const incomeCategory = (categoriesPayload.data || []).find(
    (category: any) => category.kind === 'INCOME'
  );
  const expenseCategory = (categoriesPayload.data || []).find(
    (category: any) => category.kind === 'EXPENSE'
  );

  return { account, incomeCategory, expenseCategory };
}

async function createDebtTransaction(
  page: Page,
  payload: Record<string, unknown>
) {
  const response = await page.request.post('/api/transactions', {
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('Transactions Debt Detailed', () => {
  test('creates and lists debt transactions with direction and status', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, incomeCategory, expenseCategory } =
      await fetchSeedData(page);

    test.skip(
      !account || !incomeCategory || !expenseCategory,
      'Missing seed account/category data for test user'
    );

    const uniqueToken = Date.now().toString();
    const baseDate = '2099-01-02';
    const incomeDescription = `E2E deuda ingreso ${uniqueToken}`;
    const expenseDescription = `E2E deuda gasto ${uniqueToken}`;

    await createDebtTransaction(page, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      amount: 12345,
      currencyCode: account.currencyCode,
      type: 'INCOME',
      date: baseDate,
      description: incomeDescription,
      isDebt: true,
      debtDirection: 'OWED_TO_ME',
      debtStatus: 'OPEN',
    });

    await createDebtTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 5432,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date: baseDate,
      description: expenseDescription,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'SETTLED',
      settledAt: baseDate,
    });

    await page.goto('/transactions');

    await page.locator('button:has-text("Mostrar Filtros")').click();
    await page.locator('select').nth(1).selectOption('ONLY_DEBT');

    await expect(page.getByText(incomeDescription)).toBeVisible();
    await expect(page.getByText(expenseDescription)).toBeVisible();
    await expect(page.getByText(/Me deben/)).toBeVisible();
    await expect(page.getByText(/Debo/)).toBeVisible();
    await expect(page.getByText(/Saldada/)).toBeVisible();

    await page.reload();

    await expect(page.getByText(incomeDescription)).toBeVisible();
    await expect(page.getByText(expenseDescription)).toBeVisible();
  });
});
