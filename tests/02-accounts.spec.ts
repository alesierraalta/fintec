import { test, expect } from '@playwright/test';
import { dbUtils } from './utils/database-cleanup';

test.describe('Accounts Management', () => {
  test.beforeEach(async () => {
    await dbUtils.waitForDatabase();
  });

  test.afterEach(async () => {
    await dbUtils.cleanupAllTestData();
  });

  test('should create a new cash account', async ({ page }) => {
    await page.goto('/accounts');
    
    // Click add new account button
    await page.click('text=Agregar Cuenta, text=Nueva Cuenta, text=Add Account, [data-testid="add-account"]');
    
    // Fill account form
    await page.fill('input[name="name"], [data-testid="account-name"]', 'Cuenta de Prueba');
    
    // Select account type
    await page.selectOption('select[name="type"], [data-testid="account-type"]', 'CASH');
    
    // Set currency
    await page.selectOption('select[name="currencyCode"], [data-testid="account-currency"]', 'USD');
    
    // Set initial balance
    await page.fill('input[name="balance"], [data-testid="account-balance"]', '1000');
    
    // Submit form
    await page.click('button[type="submit"], [data-testid="save-account"]');
    
    // Wait for success message or redirect
    await page.waitForTimeout(2000);
    
    // Verify account appears in the list
    await expect(page.locator('text=Cuenta de Prueba')).toBeVisible();
    await expect(page.locator('text=$1,000, text=1000')).toBeVisible();
  });

  test('should create different types of accounts', async ({ page }) => {
    await page.goto('/accounts');
    
    const accountTypes = [
      { name: 'Cuenta Bancaria', type: 'BANK', balance: '5000' },
      { name: 'Tarjeta de Crédito', type: 'CARD', balance: '0' },
      { name: 'Inversiones', type: 'INVESTMENT', balance: '10000' },
      { name: 'Ahorros', type: 'SAVINGS', balance: '2500' }
    ];

    for (const account of accountTypes) {
      // Click add account
      await page.click('text=Agregar Cuenta, text=Nueva Cuenta, text=Add Account, [data-testid="add-account"]');
      
      // Fill form
      await page.fill('input[name="name"], [data-testid="account-name"]', account.name);
      await page.selectOption('select[name="type"], [data-testid="account-type"]', account.type);
      await page.selectOption('select[name="currencyCode"], [data-testid="account-currency"]', 'USD');
      await page.fill('input[name="balance"], [data-testid="account-balance"]', account.balance);
      
      // Submit
      await page.click('button[type="submit"], [data-testid="save-account"]');
      await page.waitForTimeout(1500);
      
      // Verify account was created
      await expect(page.locator(`text=${account.name}`)).toBeVisible();
    }
    
    // Verify all accounts are visible
    for (const account of accountTypes) {
      await expect(page.locator(`text=${account.name}`)).toBeVisible();
    }
  });

  test('should edit an existing account', async ({ page }) => {
    // First create a test account
    const testAccount = await dbUtils.createTestAccount({
      name: 'Cuenta Original',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 50000 // $500.00 in cents
    });

    await page.goto('/accounts');
    
    // Find and click edit button for the account
    const accountRow = page.locator(`text=${testAccount.name}`).locator('..');
    await accountRow.locator('button:has-text("Editar"), [data-testid="edit-account"]').click();
    
    // Update account name
    await page.fill('input[name="name"], [data-testid="account-name"]', 'Cuenta Modificada');
    
    // Update balance
    await page.fill('input[name="balance"], [data-testid="account-balance"]', '750');
    
    // Save changes
    await page.click('button[type="submit"], [data-testid="save-account"]');
    await page.waitForTimeout(2000);
    
    // Verify changes
    await expect(page.locator('text=Cuenta Modificada')).toBeVisible();
    await expect(page.locator('text=$750, text=750')).toBeVisible();
    await expect(page.locator('text=Cuenta Original')).not.toBeVisible();
  });

  test('should delete an account', async ({ page }) => {
    // Create a test account
    const testAccount = await dbUtils.createTestAccount({
      name: 'Cuenta a Eliminar',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 10000
    });

    await page.goto('/accounts');
    
    // Find the account and click delete
    const accountRow = page.locator(`text=${testAccount.name}`).locator('..');
    await accountRow.locator('button:has-text("Eliminar"), [data-testid="delete-account"]').click();
    
    // Confirm deletion if there's a confirmation dialog
    if (await page.locator('text=Confirmar, text=Eliminar, text=Delete').isVisible()) {
      await page.click('text=Confirmar, text=Eliminar, text=Delete');
    }
    
    await page.waitForTimeout(2000);
    
    // Verify account is no longer visible
    await expect(page.locator('text=Cuenta a Eliminar')).not.toBeVisible();
  });

  test('should display account balance correctly', async ({ page }) => {
    // Create accounts with different balances
    await dbUtils.createTestAccount({
      name: 'Cuenta Positiva',
      type: 'BANK',
      currencyCode: 'USD',
      balance: 150000 // $1,500.00
    });

    await dbUtils.createTestAccount({
      name: 'Cuenta Cero',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 0
    });

    await page.goto('/accounts');
    
    // Check positive balance
    await expect(page.locator('text=Cuenta Positiva')).toBeVisible();
    await expect(page.locator('text=$1,500, text=1500, text=1.500')).toBeVisible();
    
    // Check zero balance
    await expect(page.locator('text=Cuenta Cero')).toBeVisible();
    await expect(page.locator('text=$0, text=0.00')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/accounts');
    
    // Try to create account without required fields
    await page.click('text=Agregar Cuenta, text=Nueva Cuenta, text=Add Account, [data-testid="add-account"]');
    
    // Try to submit empty form
    await page.click('button[type="submit"], [data-testid="save-account"]');
    
    // Check for validation messages
    await expect(page.locator('text=requerido, text=required, text=obligatorio')).toBeVisible();
    
    // Fill only name and try again
    await page.fill('input[name="name"], [data-testid="account-name"]', 'Solo Nombre');
    await page.click('button[type="submit"], [data-testid="save-account"]');
    
    // Should still show validation for other required fields
    await expect(page.locator('text=requerido, text=required, text=obligatorio')).toBeVisible();
  });

  test('should show account summary on dashboard', async ({ page }) => {
    // Create multiple accounts
    await dbUtils.createTestAccount({
      name: 'Efectivo',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 50000
    });

    await dbUtils.createTestAccount({
      name: 'Banco',
      type: 'BANK',
      currencyCode: 'USD',
      balance: 200000
    });

    await page.goto('/');
    
    // Check if accounts appear in dashboard summary
    await expect(page.locator('text=Efectivo, text=Banco')).toBeVisible();
    
    // Check total balance calculation
    await expect(page.locator('text=$2,500, text=2500, text=2.500')).toBeVisible();
  });
});



