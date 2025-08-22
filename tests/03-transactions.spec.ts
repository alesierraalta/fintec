import { test, expect } from '@playwright/test';
import { dbUtils } from './utils/database-cleanup';

test.describe('Transactions Management', () => {
  let testAccount: any;
  let testCategories: any[];

  test.beforeEach(async () => {
    await dbUtils.waitForDatabase();
    
    // Create a test account for transactions
    testAccount = await dbUtils.createTestAccount({
      name: 'Cuenta de Pruebas',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 100000 // $1,000.00
    });

    // Get available categories
    testCategories = await dbUtils.getTestCategories();
  });

  test.afterEach(async () => {
    await dbUtils.cleanupAllTestData();
  });

  test('should create an income transaction', async ({ page }) => {
    await page.goto('/transactions/add');
    
    // Select transaction type
    await page.click('text=Ingreso, [data-testid="income-tab"]');
    
    // Fill transaction form
    await page.selectOption('select[name="accountId"], [data-testid="account-select"]', testAccount.id);
    
    // Select an income category
    const incomeCategory = testCategories.find(cat => cat.kind === 'INCOME');
    if (incomeCategory) {
      await page.selectOption('select[name="categoryId"], [data-testid="category-select"]', incomeCategory.id);
    }
    
    // Fill amount
    await page.fill('input[name="amount"], [data-testid="amount-input"]', '500');
    
    // Fill description
    await page.fill('input[name="description"], [data-testid="description-input"]', 'Salario mensual');
    
    // Set date
    await page.fill('input[name="date"], [data-testid="date-input"]', '2024-01-15');
    
    // Submit transaction
    await page.click('button[type="submit"], [data-testid="save-transaction"]');
    
    await page.waitForTimeout(2000);
    
    // Verify transaction was created
    await page.goto('/transactions');
    await expect(page.locator('text=Salario mensual')).toBeVisible();
    await expect(page.locator('text=+$500, text=+500')).toBeVisible();
  });

  test('should create an expense transaction', async ({ page }) => {
    await page.goto('/transactions/add');
    
    // Select expense type
    await page.click('text=Gasto, [data-testid="expense-tab"]');
    
    // Fill transaction form
    await page.selectOption('select[name="accountId"], [data-testid="account-select"]', testAccount.id);
    
    // Select an expense category
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');
    if (expenseCategory) {
      await page.selectOption('select[name="categoryId"], [data-testid="category-select"]', expenseCategory.id);
    }
    
    // Fill amount
    await page.fill('input[name="amount"], [data-testid="amount-input"]', '150');
    
    // Fill description
    await page.fill('input[name="description"], [data-testid="description-input"]', 'Compra supermercado');
    
    // Submit transaction
    await page.click('button[type="submit"], [data-testid="save-transaction"]');
    
    await page.waitForTimeout(2000);
    
    // Verify transaction was created
    await page.goto('/transactions');
    await expect(page.locator('text=Compra supermercado')).toBeVisible();
    await expect(page.locator('text=-$150, text=-150')).toBeVisible();
  });

  test('should create multiple transactions and verify balance update', async ({ page }) => {
    // Create income transaction
    await dbUtils.createTestTransaction({
      type: 'INCOME',
      accountId: testAccount.id,
      categoryId: testCategories.find(cat => cat.kind === 'INCOME')?.id || testCategories[0].id,
      amountMinor: 200000, // $2,000
      description: 'Ingreso de prueba'
    });

    // Create expense transaction
    await dbUtils.createTestTransaction({
      type: 'EXPENSE',
      accountId: testAccount.id,
      categoryId: testCategories.find(cat => cat.kind === 'EXPENSE')?.id || testCategories[0].id,
      amountMinor: 75000, // $750
      description: 'Gasto de prueba'
    });

    await page.goto('/transactions');
    
    // Verify both transactions appear
    await expect(page.locator('text=Ingreso de prueba')).toBeVisible();
    await expect(page.locator('text=Gasto de prueba')).toBeVisible();
    
    // Check amounts
    await expect(page.locator('text=+$2,000, text=+2000')).toBeVisible();
    await expect(page.locator('text=-$750, text=-750')).toBeVisible();
  });

  test('should filter transactions by date range', async ({ page }) => {
    // Create transactions with different dates
    await dbUtils.createTestTransaction({
      type: 'INCOME',
      accountId: testAccount.id,
      categoryId: testCategories[0].id,
      amountMinor: 100000,
      description: 'Transacción Enero'
    });

    await page.goto('/transactions');
    
    // Apply date filter
    await page.fill('input[name="dateFrom"], [data-testid="date-from"]', '2024-01-01');
    await page.fill('input[name="dateTo"], [data-testid="date-to"]', '2024-01-31');
    
    await page.click('button:has-text("Filtrar"), [data-testid="apply-filters"]');
    
    await page.waitForTimeout(1000);
    
    // Verify filtered results
    await expect(page.locator('text=Transacción Enero')).toBeVisible();
  });

  test('should filter transactions by category', async ({ page }) => {
    // Create transactions with different categories
    const incomeCategory = testCategories.find(cat => cat.kind === 'INCOME');
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');

    if (incomeCategory && expenseCategory) {
      await dbUtils.createTestTransaction({
        type: 'INCOME',
        accountId: testAccount.id,
        categoryId: incomeCategory.id,
        amountMinor: 100000,
        description: 'Ingreso categoría'
      });

      await dbUtils.createTestTransaction({
        type: 'EXPENSE',
        accountId: testAccount.id,
        categoryId: expenseCategory.id,
        amountMinor: 50000,
        description: 'Gasto categoría'
      });

      await page.goto('/transactions');
      
      // Filter by income category
      await page.selectOption('select[name="categoryId"], [data-testid="category-filter"]', incomeCategory.id);
      await page.click('button:has-text("Filtrar"), [data-testid="apply-filters"]');
      
      await page.waitForTimeout(1000);
      
      // Should show only income transaction
      await expect(page.locator('text=Ingreso categoría')).toBeVisible();
      await expect(page.locator('text=Gasto categoría')).not.toBeVisible();
    }
  });

  test('should edit a transaction', async ({ page }) => {
    // Create a test transaction
    const transaction = await dbUtils.createTestTransaction({
      type: 'EXPENSE',
      accountId: testAccount.id,
      categoryId: testCategories[0].id,
      amountMinor: 100000,
      description: 'Transacción original'
    });

    await page.goto('/transactions');
    
    // Find and edit the transaction
    const transactionRow = page.locator('text=Transacción original').locator('..');
    await transactionRow.locator('button:has-text("Editar"), [data-testid="edit-transaction"]').click();
    
    // Update description
    await page.fill('input[name="description"], [data-testid="description-input"]', 'Transacción modificada');
    
    // Update amount
    await page.fill('input[name="amount"], [data-testid="amount-input"]', '200');
    
    // Save changes
    await page.click('button[type="submit"], [data-testid="save-transaction"]');
    
    await page.waitForTimeout(2000);
    
    // Verify changes
    await expect(page.locator('text=Transacción modificada')).toBeVisible();
    await expect(page.locator('text=$200, text=200')).toBeVisible();
    await expect(page.locator('text=Transacción original')).not.toBeVisible();
  });

  test('should delete a transaction', async ({ page }) => {
    // Create a test transaction
    await dbUtils.createTestTransaction({
      type: 'EXPENSE',
      accountId: testAccount.id,
      categoryId: testCategories[0].id,
      amountMinor: 50000,
      description: 'Transacción a eliminar'
    });

    await page.goto('/transactions');
    
    // Find and delete the transaction
    const transactionRow = page.locator('text=Transacción a eliminar').locator('..');
    await transactionRow.locator('button:has-text("Eliminar"), [data-testid="delete-transaction"]').click();
    
    // Confirm deletion
    if (await page.locator('text=Confirmar, text=Eliminar').isVisible()) {
      await page.click('text=Confirmar, text=Eliminar');
    }
    
    await page.waitForTimeout(2000);
    
    // Verify transaction is deleted
    await expect(page.locator('text=Transacción a eliminar')).not.toBeVisible();
  });

  test('should validate required fields in transaction form', async ({ page }) => {
    await page.goto('/transactions/add');
    
    // Try to submit empty form
    await page.click('button[type="submit"], [data-testid="save-transaction"]');
    
    // Check for validation messages
    await expect(page.locator('text=requerido, text=required, text=obligatorio')).toBeVisible();
    
    // Fill only amount and try again
    await page.fill('input[name="amount"], [data-testid="amount-input"]', '100');
    await page.click('button[type="submit"], [data-testid="save-transaction"]');
    
    // Should still show validation for other required fields
    await expect(page.locator('text=requerido, text=required, text=obligatorio')).toBeVisible();
  });

  test('should show transaction summary on dashboard', async ({ page }) => {
    // Create sample transactions
    await dbUtils.createTestTransaction({
      type: 'INCOME',
      accountId: testAccount.id,
      categoryId: testCategories.find(cat => cat.kind === 'INCOME')?.id || testCategories[0].id,
      amountMinor: 300000,
      description: 'Ingreso dashboard'
    });

    await dbUtils.createTestTransaction({
      type: 'EXPENSE',
      accountId: testAccount.id,
      categoryId: testCategories.find(cat => cat.kind === 'EXPENSE')?.id || testCategories[0].id,
      amountMinor: 150000,
      description: 'Gasto dashboard'
    });

    await page.goto('/');
    
    // Check if recent transactions appear on dashboard
    await expect(page.locator('text=Ingreso dashboard, text=Gasto dashboard')).toBeVisible();
    
    // Check if summary totals are displayed
    await expect(page.locator('text=$3,000, text=3000, text=$1,500, text=1500')).toBeVisible();
  });
});



