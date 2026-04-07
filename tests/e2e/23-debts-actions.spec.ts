import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { bootstrapCanonicalFixtures } from '@/tests/support/auth/bootstrap';

async function postTransaction(page: Page, payload: Record<string, unknown>) {
  const response = await page.request.post('/api/transactions', {
    data: payload,
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function deleteTransaction(page: Page, id: string) {
  const response = await page.request.delete(`/api/transactions?id=${id}`);
  expect(response.ok()).toBeTruthy();
}

async function updateTransaction(
  page: Page,
  id: string,
  payload: Record<string, unknown>
) {
  const response = await page.request.put('/api/transactions', {
    data: { id, ...payload },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Debts Management Actions @auth-required', () => {
  test('quick-settle: click settle, confirm, verify SETTLED status + toast', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, expenseCategory } = await bootstrapCanonicalFixtures(page);
    const token = Date.now().toString();
    const description = `E2E settle test ${token}`;
    const date = '2099-06-15';

    const created = await postTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 5000,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date,
      description,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'OPEN',
    });

    await page.goto('/debts');
    await page.locator('input[type="date"]').first().fill(date);
    await page.locator('input[type="date"]').nth(1).fill(date);
    await page.locator('select').nth(1).selectOption('ALL');

    await expect(page.getByText(description)).toBeVisible();
    await expect(page.getByText('Abierta')).toBeVisible();

    // Click settle button
    await page
      .getByRole('button', { name: `Saldar deuda: ${description}` })
      .click();

    // Confirm dialog should appear
    await expect(page.getByText('Confirmar liquidacion')).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: 'Confirmar' }).click();

    // Wait for the dialog to close and toast to appear
    await expect(page.getByText('Deuda saldada exitosamente')).toBeVisible();

    // Verify the debt now shows as Saldada
    await expect(page.getByText('Saldada')).toBeVisible();
  });

  test('settle cancel: open confirm, cancel, verify no change', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, expenseCategory } = await bootstrapCanonicalFixtures(page);
    const token = Date.now().toString();
    const description = `E2E settle cancel ${token}`;
    const date = '2099-06-16';

    await postTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 3000,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date,
      description,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'OPEN',
    });

    await page.goto('/debts');
    await page.locator('input[type="date"]').first().fill(date);
    await page.locator('input[type="date"]').nth(1).fill(date);
    await page.locator('select').nth(1).selectOption('ALL');

    // Click settle
    await page
      .getByRole('button', { name: `Saldar deuda: ${description}` })
      .click();
    await expect(page.getByText('Confirmar liquidacion')).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Dialog should close, debt should remain OPEN
    await expect(page.getByText('Confirmar liquidacion')).not.toBeVisible();
    await expect(page.getByText('Abierta')).toBeVisible();
    await expect(
      page.getByText('Deuda saldada exitosamente')
    ).not.toBeVisible();
  });

  test('create debt: click Nueva Deuda, fill form, submit, verify debt appears', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    await bootstrapCanonicalFixtures(page);

    await page.goto('/debts');

    // Click "Nueva Deuda" button
    await page.getByRole('button', { name: /Nueva Deuda/i }).click();

    // Form should open with "Nueva Deuda" title
    await expect(page.getByText('Nueva Deuda')).toBeVisible();

    // Fill the form
    // Type should already be EXPENSE (default for debt create)
    await page.getByLabel('Monto').fill('150.00');

    // Select account
    await page.getByLabel('Cuenta').click();
    await page.getByRole('option').first().click();

    // Select category
    await page.getByLabel('Categoría').click();
    await page.getByRole('option').first().click();

    // Description
    await page.getByLabel('Descripción').fill('E2E created debt');

    // Select debt direction
    const directionSelect = page.getByLabel('Direccion');
    await directionSelect.click();
    await page.getByRole('option', { name: 'Debo' }).click();

    // Submit
    await page.getByRole('button', { name: /Guardar/i }).click();

    // Wait for success toast
    await expect(page.getByText('Deuda creada exitosamente')).toBeVisible({
      timeout: 10000,
    });

    // Form should close
    await expect(page.getByText('Nueva Deuda')).not.toBeVisible();
  });

  test('delete debt: click delete, confirm, verify debt removed', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, expenseCategory } = await bootstrapCanonicalFixtures(page);
    const token = Date.now().toString();
    const description = `E2E delete test ${token}`;
    const date = '2099-06-17';

    await postTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 2000,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date,
      description,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'OPEN',
    });

    await page.goto('/debts');
    await page.locator('input[type="date"]').first().fill(date);
    await page.locator('input[type="date"]').nth(1).fill(date);
    await page.locator('select').nth(1).selectOption('ALL');

    await expect(page.getByText(description)).toBeVisible();

    // Click delete button
    await page
      .getByRole('button', { name: `Eliminar deuda: ${description}` })
      .click();

    // Confirm dialog should appear
    await expect(page.getByText('Eliminar deuda')).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: 'Eliminar' }).click();

    // Wait for toast
    await expect(page.getByText('Deuda eliminada')).toBeVisible();

    // Debt should be removed
    await expect(page.getByText(description)).not.toBeVisible();
  });

  test('settled debts hide Settle button', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, expenseCategory } = await bootstrapCanonicalFixtures(page);
    const token = Date.now().toString();
    const description = `E2E settled no settle button ${token}`;
    const date = '2099-06-18';

    await postTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 4000,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date,
      description,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'SETTLED',
      settledAt: date,
    });

    await page.goto('/debts');
    await page.locator('input[type="date"]').first().fill(date);
    await page.locator('input[type="date"]').nth(1).fill(date);
    await page.locator('select').nth(1).selectOption('ALL');

    await expect(page.getByText(description)).toBeVisible();
    await expect(page.getByText('Saldada')).toBeVisible();

    // Settle button should NOT be visible for settled debts
    await expect(
      page.getByRole('button', { name: `Saldar deuda: ${description}` })
    ).not.toBeVisible();

    // But Edit and Delete should still be visible
    await expect(
      page.getByRole('button', { name: `Editar deuda: ${description}` })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Eliminar deuda: ${description}` })
    ).toBeVisible();
  });

  test('action buttons have aria-labels per NFR-2', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, expenseCategory } = await bootstrapCanonicalFixtures(page);
    const token = Date.now().toString();
    const description = `E2E aria labels test ${token}`;
    const date = '2099-06-19';

    await postTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 1000,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date,
      description,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'OPEN',
    });

    await page.goto('/debts');
    await page.locator('input[type="date"]').first().fill(date);
    await page.locator('input[type="date"]').nth(1).fill(date);
    await page.locator('select').nth(1).selectOption('ALL');

    // Verify aria-labels exist
    await expect(
      page.getByRole('button', { name: `Saldar deuda: ${description}` })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Editar deuda: ${description}` })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Eliminar deuda: ${description}` })
    ).toBeVisible();
  });

  test('delete cancel: open confirm, cancel, verify no change', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this E2E flow on the primary desktop project'
    );

    const { account, expenseCategory } = await bootstrapCanonicalFixtures(page);
    const token = Date.now().toString();
    const description = `E2E delete cancel ${token}`;
    const date = '2099-06-20';

    await postTransaction(page, {
      accountId: account.id,
      categoryId: expenseCategory.id,
      amount: 2500,
      currencyCode: account.currencyCode,
      type: 'EXPENSE',
      date,
      description,
      isDebt: true,
      debtDirection: 'OWE',
      debtStatus: 'OPEN',
    });

    await page.goto('/debts');
    await page.locator('input[type="date"]').first().fill(date);
    await page.locator('input[type="date"]').nth(1).fill(date);
    await page.locator('select').nth(1).selectOption('ALL');

    // Click delete
    await page
      .getByRole('button', { name: `Eliminar deuda: ${description}` })
      .click();
    await expect(page.getByText('Eliminar deuda')).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Dialog should close, debt should remain
    await expect(page.getByText('Eliminar deuda')).not.toBeVisible();
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.getByText('Deuda eliminada')).not.toBeVisible();
  });
});
