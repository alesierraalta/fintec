import { test, expect } from '@playwright/test';
import { dbUtils } from './utils/database-cleanup';

test.describe('Navigation and Basic UI', () => {
  test.beforeEach(async () => {
    // Ensure database is ready
    await dbUtils.waitForDatabase();
  });

  test.afterEach(async () => {
    // Clean up any test data created during the test
    await dbUtils.cleanupAllTestData();
  });

  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads successfully
    await expect(page).toHaveTitle(/MiAppFinanzas|Finanzas/);
    
    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should navigate to all main sections', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to accounts
    await page.click('text=Cuentas');
    await expect(page).toHaveURL(/.*accounts/);
    await expect(page.locator('h1, h2')).toContainText(/Cuentas|Accounts/);

    // Test navigation to transactions
    await page.click('text=Transacciones');
    await expect(page).toHaveURL(/.*transactions/);
    await expect(page.locator('h1, h2')).toContainText(/Transacciones|Transactions/);

    // Test navigation to budgets
    await page.click('text=Presupuestos');
    await expect(page).toHaveURL(/.*budgets/);
    await expect(page.locator('h1, h2')).toContainText(/Presupuestos|Budgets/);

    // Test navigation to goals
    await page.click('text=Metas');
    await expect(page).toHaveURL(/.*goals/);
    await expect(page.locator('h1, h2')).toContainText(/Metas|Goals/);

    // Test navigation to reports
    await page.click('text=Reportes');
    await expect(page).toHaveURL(/.*reports/);
    await expect(page.locator('h1, h2')).toContainText(/Reportes|Reports/);
  });

  test('should show dashboard with financial overview', async ({ page }) => {
    await page.goto('/');
    
    // Check for dashboard elements
    await expect(page.locator('[data-testid="dashboard"], .dashboard')).toBeVisible();
    
    // Look for financial summary cards
    const summaryCards = page.locator('.card, [data-testid="stat-card"]');
    await expect(summaryCards.first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if mobile navigation is present
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav');
    await expect(mobileNav).toBeVisible();
    
    // Check if desktop sidebar is hidden on mobile
    const sidebar = page.locator('[data-testid="sidebar"], .sidebar');
    if (await sidebar.count() > 0) {
      await expect(sidebar).toBeHidden();
    }
  });

  test('should handle navigation between pages smoothly', async ({ page }) => {
    await page.goto('/');
    
    // Navigate through multiple pages quickly
    await page.click('text=Cuentas');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Transacciones');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Presupuestos');
    await page.waitForLoadState('networkidle');
    
    // Go back to dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/');
  });

  test('should load categories from database', async ({ page }) => {
    await page.goto('/categories');
    
    // Wait for categories to load
    await page.waitForTimeout(2000);
    
    // Check if categories are displayed
    const categoryCards = page.locator('.card, [data-testid="category-card"]');
    
    // We should have at least some categories (we know there are 13 in the database)
    await expect(categoryCards.first()).toBeVisible({ timeout: 10000 });
    
    // Check for both income and expense categories
    await expect(page.locator('text=INCOME, text=Ingresos, text=EXPENSE, text=Gastos')).toBeVisible();
  });
});



