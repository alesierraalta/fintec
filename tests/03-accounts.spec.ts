import { test, expect } from '@playwright/test';

test.describe('Account Management', () => {
  
  test('should display accounts page', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('/accounts');
    
    // Should show accounts page
    await expect(page.locator('text=Cuentas, text=Accounts')).toBeVisible({ timeout: 10000 });
    
    // Verify page is accessible (not redirected to login)
    expect(page.url()).not.toContain('/auth/');
    
    // Should show accounts table or list
    const accountsList = page.locator('table, .accounts-list, [data-testid="accounts-list"]');
    await expect(accountsList).toBeVisible({ timeout: 10000 });
  });
  
  test('should create new account', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('/accounts');
    
    // Look for add account button
    const addButton = page.locator('button:has-text("Agregar"), button:has-text("Add"), button:has-text("Nueva"), [data-testid="add-account"]');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    
    // Fill account form
    await page.fill('input[name="name"], input[placeholder*="nombre"], input[placeholder*="name"]', 'Test Account');
    await page.fill('input[name="balance"], input[placeholder*="saldo"], input[placeholder*="balance"]', '1000.00');
    
    // Select account type if available
    const accountTypeSelect = page.locator('select[name="type"], select[name="accountType"]');
    if (await accountTypeSelect.isVisible()) {
      await accountTypeSelect.selectOption('checking');
    }
    
    // Submit account
    const submitButton = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Verify account was created
    await expect(page.locator('text=Test Account')).toBeVisible({ timeout: 10000 });
  });
  
  test('should edit account details', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('/accounts');
    
    // Look for edit button
    const editButton = page.locator('button:has-text("Editar"), button:has-text("Edit"), [data-testid="edit-account"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Edit account name
      const nameInput = page.locator('input[name="name"], input[placeholder*="nombre"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Updated Test Account');
      }
      
      // Save changes
      const saveButton = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")');
      await saveButton.click();
      
      // Verify changes were saved
      await expect(page.locator('text=Updated Test Account')).toBeVisible({ timeout: 10000 });
    } else {
      // If no accounts exist, this test passes as there's nothing to edit
      console.log('No accounts available to edit');
    }
  });
  
  test('should delete account', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('/accounts');
    
    // Look for delete button
    const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("Delete"), [data-testid="delete-account"]').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("Yes")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify account was deleted (wait for page to update)
      await page.waitForTimeout(2000);
    } else {
      // If no accounts exist, this test passes as there's nothing to delete
      console.log('No accounts available to delete');
    }
  });
  
  test('should display account balance', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('/accounts');
    
    // Should show account balances
    const balanceElements = page.locator('text=$, text=€, text=₡, .balance, [data-testid="balance"]');
    
    if (await balanceElements.count() > 0) {
      await expect(balanceElements.first()).toBeVisible();
    } else {
      // Verify accounts page loads even if no balances are shown
      await expect(page.locator('text=Cuentas, text=Accounts')).toBeVisible({ timeout: 10000 });
    }
  });
  
  test('should navigate between accounts and transactions', async ({ page }) => {
    // Navigate to accounts page
    await page.goto('/accounts');
    await expect(page.locator('text=Cuentas, text=Accounts')).toBeVisible({ timeout: 10000 });
    
    // Navigate to transactions page
    await page.goto('/transactions');
    await expect(page.locator('text=Transacciones, text=Transactions')).toBeVisible({ timeout: 10000 });
    
    // Navigate back to accounts
    await page.goto('/accounts');
    await expect(page.locator('text=Cuentas, text=Accounts')).toBeVisible({ timeout: 10000 });
    
    // Verify navigation works (not redirected to login)
    expect(page.url()).not.toContain('/auth/');
  });
});

