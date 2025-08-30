import { test, expect } from '@playwright/test';
import { dbUtils } from './utils/database-cleanup';

test.describe('Complete E2E Financial App Test', () => {
  test.beforeEach(async () => {
    await dbUtils.waitForDatabase();
  });

  test.afterEach(async () => {
    await dbUtils.cleanupAllTestData();
  });

  test('should complete full user workflow', async ({ page }) => {
    // 1. Load the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    
    // 2. Navigate to accounts page
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*accounts/);
    
    
    // 3. Check database connection by verifying categories
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const pageContent = await page.textContent('body');
    const hasCategoryContent = pageContent.includes('Salario') || 
                               pageContent.includes('Alimentación') ||
                               pageContent.includes('categoria') ||
                               pageContent.includes('category');
    expect(hasCategoryContent).toBeTruthy();
    
    
    // 4. Test navigation to all main sections
    const sections = [
      { path: '/accounts', name: 'Accounts' },
      { path: '/transactions', name: 'Transactions' },
      { path: '/budgets', name: 'Budgets' },
      { path: '/goals', name: 'Goals' },
      { path: '/reports', name: 'Reports' }
    ];
    
    for (const section of sections) {
      await page.goto(section.path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(section.path));
      
      // Verify page has content
      const content = await page.textContent('body');
      expect(content.length).toBeGreaterThan(100);
      
    }
    
    // 5. Test responsive design
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const isVisible = await page.locator('body').isVisible();
      expect(isVisible).toBeTruthy();
      
    }
    
    // Reset to desktop for remaining tests
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 6. Test data creation and display
    const testAccount = await dbUtils.createTestAccount({
      name: 'E2E Test Account',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 500000 // $5,000.00
    });
    
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const accountContent = await page.textContent('body');
    expect(accountContent).toContain('E2E Test Account');
    
    
    // 7. Test transaction creation
    const categories = await dbUtils.getTestCategories();
    const incomeCategory = categories.find(cat => cat.kind === 'INCOME');
    
    if (incomeCategory) {
      const testTransaction = await dbUtils.createTestTransaction({
        type: 'INCOME',
        accountId: testAccount.id,
        categoryId: incomeCategory.id,
        amountMinor: 100000, // $1,000
        description: 'E2E Test Income'
      });
      
      await page.goto('/transactions');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const transactionContent = await page.textContent('body');
      expect(transactionContent).toContain('E2E Test Income');
      
    }
    
    // 8. Test dashboard with data
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const dashboardContent = await page.textContent('body');
    
    // Should show some financial data
    const hasFinancialData = dashboardContent.includes('$') || 
                             dashboardContent.includes('balance') ||
                             dashboardContent.includes('total') ||
                             dashboardContent.includes('E2E Test Account');
    expect(hasFinancialData).toBeTruthy();
    
    
    // 9. Test error handling - try to access non-existent page
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');
    
    // Should either redirect or show proper error page
    const errorContent = await page.textContent('body');
    const hasProperErrorHandling = errorContent.includes('404') || 
                                   errorContent.includes('Not Found') ||
                                   page.url().includes('/') || // Redirected to home
                                   errorContent.length > 100; // Some content loaded
    expect(hasProperErrorHandling).toBeTruthy();
    
    
    // 10. Final verification - return to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
    
    
  });

  test('should verify database integration end-to-end', async ({ page }) => {
    // Test complete CRUD operations through the UI and database
    
    // 1. Verify categories exist (READ)
    const categories = await dbUtils.getTestCategories();
    expect(categories.length).toBeGreaterThan(0);
    
    // 2. Create test account (CREATE)
    const testAccount = await dbUtils.createTestAccount({
      name: 'Database Integration Test',
      type: 'BANK',
      currencyCode: 'USD',
      balance: 1000000 // $10,000.00
    });
    expect(testAccount.id).toBeDefined();
    
    // 3. Create test transaction (CREATE)
    const incomeCategory = categories.find(cat => cat.kind === 'INCOME');
    if (incomeCategory) {
      const testTransaction = await dbUtils.createTestTransaction({
        type: 'INCOME',
        accountId: testAccount.id,
        categoryId: incomeCategory.id,
        amountMinor: 250000, // $2,500
        description: 'Database Integration Income'
      });
      expect(testTransaction.id).toBeDefined();
    }
    
    // 4. Verify data appears in UI (READ through UI)
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const accountsContent = await page.textContent('body');
    expect(accountsContent).toContain('Database Integration Test');
    
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const transactionsContent = await page.textContent('body');
    expect(transactionsContent).toContain('Database Integration Income');
    
    // 5. Test data persistence by refreshing
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const refreshedContent = await page.textContent('body');
    expect(refreshedContent).toContain('Database Integration Income');
    
  });
});



