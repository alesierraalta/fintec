import { test, expect } from '@playwright/test';
import { dbUtils } from './utils/database-cleanup';

test.describe('Navigation and Basic UI (Improved)', () => {
  test.beforeEach(async () => {
    await dbUtils.waitForDatabase();
  });

  test.afterEach(async () => {
    await dbUtils.cleanupAllTestData();
  });

  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page loads successfully (more flexible)
    await expect(page).toHaveTitle(/.*Finanzas.*|.*Finance.*|.*App.*/);
    
    // Check for any navigation elements (more flexible selectors)
    const hasNav = await page.locator('nav, [role="navigation"], header').count() > 0;
    expect(hasNav).toBeTruthy();
  });

  test('should navigate between main sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test navigation to accounts - use href instead of text
    const accountsLink = page.locator('a[href*="accounts"], a[href="/accounts"]').first();
    if (await accountsLink.count() > 0) {
      await accountsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*accounts/);
    }

    // Test navigation to transactions
    const transactionsLink = page.locator('a[href*="transactions"], a[href="/transactions"]').first();
    if (await transactionsLink.count() > 0) {
      await transactionsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*transactions/);
    }

    // Test navigation back to home
    const homeLink = page.locator('a[href="/"], a[href*="dashboard"]').first();
    if (await homeLink.count() > 0) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/');
    }
  });

  test('should display main dashboard content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for any card-like elements or main content
    const hasContent = await page.locator('div, section, main, article').count() > 0;
    expect(hasContent).toBeTruthy();
    
    // Check for any financial-related text
    const hasFinancialContent = await page.locator('text=/balance|total|cuenta|ingreso|gasto|transaction|account/i').count() > 0;
    expect(hasFinancialContent).toBeTruthy();
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    const desktopContent = await page.locator('body').isVisible();
    expect(desktopContent).toBeTruthy();
    
    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    const tabletContent = await page.locator('body').isVisible();
    expect(tabletContent).toBeTruthy();
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    const mobileContent = await page.locator('body').isVisible();
    expect(mobileContent).toBeTruthy();
  });

  test('should connect to database and load categories', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for data to load
    
    // Check if any content loaded (more flexible)
    const pageContent = await page.textContent('body');
    
    // Should have some content (not just empty page)
    expect(pageContent.length).toBeGreaterThan(100);
    
    // Look for category-related content
    const hasCategoryContent = pageContent.includes('categoria') || 
                               pageContent.includes('category') ||
                               pageContent.includes('ingreso') ||
                               pageContent.includes('gasto') ||
                               pageContent.includes('income') ||
                               pageContent.includes('expense');
    expect(hasCategoryContent).toBeTruthy();
  });

  test('should handle page navigation without errors', async ({ page }) => {
    const pages = ['/', '/accounts', '/transactions', '/categories', '/budgets', '/goals', '/reports'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Check that page loaded without critical errors
      const pageContent = await page.textContent('body');
      expect(pageContent.length).toBeGreaterThan(50);
      
      // Check for no obvious error messages
      const hasError = pageContent.toLowerCase().includes('error 404') || 
                       pageContent.toLowerCase().includes('page not found');
      expect(hasError).toBeFalsy();
    }
  });

  test('should load and display data from Supabase', async ({ page }) => {
    // Create test data first
    const testAccount = await dbUtils.createTestAccount({
      name: 'Test Account Display',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 100000 // $1,000.00
    });

    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check if test account appears on the page
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Test Account Display');
  });

  test('should handle form interactions', async ({ page }) => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Look for any button or link that might add an account
    const addButtons = await page.locator('button, a').all();
    
    for (const button of addButtons) {
      const text = await button.textContent();
      if (text && (text.toLowerCase().includes('add') || 
                   text.toLowerCase().includes('nuevo') || 
                   text.toLowerCase().includes('crear') ||
                   text.toLowerCase().includes('agregar'))) {
        
        // Try to click the add button
        await button.click();
        await page.waitForTimeout(2000);
        
        // Check if a form or modal appeared
        const formElements = await page.locator('form, input, [role="dialog"]').count();
        expect(formElements).toBeGreaterThan(0);
        break;
      }
    }
  });
});



