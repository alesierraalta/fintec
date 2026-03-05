import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function fetchSeedData(page: Page) {
  const [accountsResponse, categoriesResponse] = await Promise.all([
    page.request.get('/api/accounts?active=true'),
    page.request.get('/api/categories'),
  ]);

  if (!accountsResponse.ok() || !categoriesResponse.ok()) {
    return { account: null, incomeCategory: null, expenseCategory: null };
  }

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

async function createSimpleTransaction(
  page: Page,
  payload: Record<string, unknown>
) {
  const response = await page.request.post('/api/transactions', {
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function swipeLeft(page: Page, target: Locator) {
  const box = await target.boundingBox();
  expect(box).toBeTruthy();

  const centerY = box!.y + box!.height / 2;
  const startX = box!.x + box!.width * 0.8;
  const endX = box!.x + box!.width * 0.25;

  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move(endX, centerY, { steps: 8 });
  await page.mouse.up();
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

  test('mobile swipe reveals actions without opening details and keeps hint/amount separation', async ({
    page,
  }, testInfo) => {
    test.skip(
      !['Mobile Chrome', 'Mobile Safari'].includes(testInfo.project.name),
      'Run this swipe arbitration flow on mobile projects only'
    );

    const { account, expenseCategory } = await fetchSeedData(page);

    test.skip(
      !account || !expenseCategory,
      'Missing seed account/category data for test user'
    );

    const uniqueToken = Date.now().toString();
    const description = `E2E swipe tx ${uniqueToken}`;

    await createSimpleTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 3210,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date: '2099-02-01',
      description,
    });

    await page.goto('/transactions');

    const listHint = page.locator('.transactions-mobile-swipe-hint');
    await expect(listHint).toBeVisible();

    const targetRow = page
      .locator('div[role="button"]')
      .filter({ hasText: description })
      .first();
    await expect(targetRow).toBeVisible();

    await expect(targetRow.getByText('Desliza')).toHaveCount(0);

    await swipeLeft(page, targetRow);

    const actionTray = targetRow
      .locator('xpath=..')
      .locator('button[aria-label="Editar"]');
    await expect(actionTray).toBeVisible();

    await expect(page.getByRole('button', { name: 'Cerrar' })).toHaveCount(0);

    const currencyLabel = targetRow
      .locator('span')
      .filter({
        hasText: /^(USD|VES|EUR|GBP|JPY|CAD|AUD|BRL|PEN|MXN|ARS|COP|CLP)$/,
      })
      .first();
    const hintBox = await listHint.boundingBox();
    const currencyBox = await currencyLabel.boundingBox();

    if (hintBox && currencyBox) {
      const overlapX =
        hintBox.x < currencyBox.x + currencyBox.width &&
        hintBox.x + hintBox.width > currencyBox.x;
      const overlapY =
        hintBox.y < currencyBox.y + currencyBox.height &&
        hintBox.y + hintBox.height > currencyBox.y;
      expect(overlapX && overlapY).toBeFalsy();
    }
  });

  test('desktop non-regression keeps transaction row click and swipe functional', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this non-regression smoke on the desktop Chromium project'
    );

    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/transactions/);

    const swipeableRows = page.locator('div[role="button"]');
    const rowCount = await swipeableRows.count();

    test.skip(
      rowCount === 0,
      'No swipeable transaction rows available for desktop interaction checks in this environment'
    );

    const targetRow = swipeableRows.first();
    await expect(targetRow).toBeVisible();

    await targetRow.click();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar' }).first().click();

    await swipeLeft(page, targetRow);
    await expect(
      targetRow.locator('xpath=..').locator('button[aria-label="Editar"]')
    ).toBeVisible();
  });
});
