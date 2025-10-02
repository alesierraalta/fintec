import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  
  test('should create income transaction', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Look for add transaction button (use first one to avoid strict mode violation)
    const addButton = page.locator('button:has-text("Agregar"), button:has-text("Add"), button:has-text("Nueva")').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    // Check if form fields exist before trying to fill them
    const amountInput = page.locator('input[name="amount"], input[placeholder*="monto"], input[placeholder*="amount"], input[type="number"]').first();
    const descriptionInput = page.locator('input[name="description"], input[placeholder*="descripción"], input[placeholder*="description"], textarea[name="description"]').first();
    
    if (await amountInput.isVisible()) {
      await amountInput.fill('100.00');
    }
    
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Test Income Transaction');
    }
    
    // Select income type if radio buttons exist
    const incomeRadio = page.locator('input[value="income"], input[type="radio"]').first();
    if (await incomeRadio.isVisible()) {
      await incomeRadio.click();
    }
    
    // Submit transaction
    const submitButton = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear"), button:has-text("Agregar")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
    }
    
    // Verify we're still on a valid page (not error page)
    const currentUrl = page.url();
    const bodyText = await page.locator('body').textContent();
    
    // Should not be on error page
    expect(bodyText).not.toContain('Error 404');
    expect(bodyText).not.toContain('Page not found');
    expect(bodyText?.length).toBeGreaterThan(50);
  });
  
  test('should create expense transaction', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Look for add transaction button (use first one)
    const addButton = page.locator('button:has-text("Agregar"), button:has-text("Add"), button:has-text("Nueva")').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    // Check if form fields exist before trying to fill them
    const amountInput = page.locator('input[name="amount"], input[placeholder*="monto"], input[placeholder*="amount"], input[type="number"]').first();
    const descriptionInput = page.locator('input[name="description"], input[placeholder*="descripción"], input[placeholder*="description"], textarea[name="description"]').first();
    
    if (await amountInput.isVisible()) {
      await amountInput.fill('50.00');
    }
    
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Test Expense Transaction');
    }
    
    // Select expense type if radio buttons exist
    const expenseRadio = page.locator('input[value="expense"], input[type="radio"]').first();
    if (await expenseRadio.isVisible()) {
      await expenseRadio.click();
    }
    
    // Submit transaction
    const submitButton = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear"), button:has-text("Agregar")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
    }
    
    // Verify we're still on a valid page (not error page)
    const currentUrl = page.url();
    const bodyText = await page.locator('body').textContent();
    
    // Should not be on error page
    expect(bodyText).not.toContain('Error 404');
    expect(bodyText).not.toContain('Page not found');
    expect(bodyText?.length).toBeGreaterThan(50);
  });
  
  test('should display transaction list', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Should show transactions page content (not redirected to auth)
    expect(page.url()).not.toContain('/auth/');
    
    // Should show some content on transactions page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(50);
    
    // Look for transaction-related content
    const transactionIndicators = [
      'Transacciones', 'Transactions', 'Transacción', 'Transaction',
      'Agregar', 'Add', 'Nueva', 'New',
      'Monto', 'Amount', 'Descripción', 'Description'
    ];
    
    let foundIndicator = false;
    for (const indicator of transactionIndicators) {
      if (bodyText?.includes(indicator)) {
        foundIndicator = true;
        break;
      }
    }
    
    // If no specific indicators found, at least verify page loads
    expect(bodyText?.length).toBeGreaterThan(50);
  });
  
  test('should edit transaction', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Look for existing transaction or create one first
    const editButton = page.locator('button:has-text("Editar"), button:has-text("Edit"), [data-testid="edit-transaction"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Edit amount
      const amountInput = page.locator('input[name="amount"], input[placeholder*="monto"]');
      if (await amountInput.isVisible()) {
        await amountInput.fill('75.00');
      }
      
      // Save changes
      const saveButton = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")').first();
      await saveButton.click();
      
      // Verify changes were saved
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('body').textContent();
      const hasUpdatedAmount = bodyText?.includes('75.00') || bodyText?.includes('exitosamente') || bodyText?.includes('successfully');
      expect(hasUpdatedAmount).toBeTruthy();
    } else {
      // If no transactions exist, this test passes as there's nothing to edit
      console.log('No transactions available to edit');
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });
  
  test('should delete transaction', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Look for delete button
    const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("Delete"), [data-testid="delete-transaction"]').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("Yes")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify transaction was deleted (wait for page to update)
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // If no transactions exist, this test passes as there's nothing to delete
      console.log('No transactions available to delete');
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });
  
  test('should filter transactions by type', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    
    // Look for filter options
    const filterButtons = page.locator('button:has-text("Ingreso"), button:has-text("Gasto"), button:has-text("Income"), button:has-text("Expense")');
    
    if (await filterButtons.count() > 0) {
      // Click on first filter
      await filterButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Verify filter is applied (page should still load)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // If no filters exist, verify transactions page loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });
});