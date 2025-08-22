import { test, expect } from '@playwright/test';
import { dbUtils } from './utils/database-cleanup';

test.describe('Financial Reports', () => {
  let testAccount: any;
  let testCategories: any[];

  test.beforeEach(async () => {
    await dbUtils.waitForDatabase();
    
    testAccount = await dbUtils.createTestAccount({
      name: 'Cuenta Reportes',
      type: 'BANK',
      currencyCode: 'USD',
      balance: 1000000 // $10,000.00
    });

    testCategories = await dbUtils.getTestCategories();
    
    // Create sample transactions for reports
    const incomeCategory = testCategories.find(cat => cat.kind === 'INCOME');
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');

    if (incomeCategory && expenseCategory) {
      // Create multiple transactions for meaningful reports
      await dbUtils.createTestTransaction({
        type: 'INCOME',
        accountId: testAccount.id,
        categoryId: incomeCategory.id,
        amountMinor: 500000, // $5,000
        description: 'Ingreso reporte 1'
      });

      await dbUtils.createTestTransaction({
        type: 'INCOME',
        accountId: testAccount.id,
        categoryId: incomeCategory.id,
        amountMinor: 300000, // $3,000
        description: 'Ingreso reporte 2'
      });

      await dbUtils.createTestTransaction({
        type: 'EXPENSE',
        accountId: testAccount.id,
        categoryId: expenseCategory.id,
        amountMinor: 200000, // $2,000
        description: 'Gasto reporte 1'
      });

      await dbUtils.createTestTransaction({
        type: 'EXPENSE',
        accountId: testAccount.id,
        categoryId: expenseCategory.id,
        amountMinor: 150000, // $1,500
        description: 'Gasto reporte 2'
      });
    }
  });

  test.afterEach(async () => {
    await dbUtils.cleanupAllTestData();
  });

  test('should display monthly report overview', async ({ page }) => {
    await page.goto('/reports');
    
    // Wait for report to load
    await page.waitForTimeout(3000);
    
    // Check for report elements
    await expect(page.locator('text=Reporte Mensual, text=Monthly Report, text=Resumen')).toBeVisible();
    
    // Should show income and expense totals
    await expect(page.locator('text=Ingresos, text=Income')).toBeVisible();
    await expect(page.locator('text=Gastos, text=Expenses')).toBeVisible();
    
    // Should show monetary amounts
    await expect(page.locator('text=$8,000, text=8000, text=$3,500, text=3500')).toBeVisible();
  });

  test('should show income vs expenses chart', async ({ page }) => {
    await page.goto('/reports');
    
    // Wait for charts to load
    await page.waitForTimeout(5000);
    
    // Look for chart containers
    await expect(page.locator('canvas, svg, [data-testid="chart"], .chart')).toBeVisible();
    
    // Check for chart legend or labels
    await expect(page.locator('text=Ingresos, text=Gastos, text=Income, text=Expenses')).toBeVisible();
  });

  test('should display category breakdown', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Should show category-wise breakdown
    await expect(page.locator('text=Por Categoría, text=By Category, text=Categorías')).toBeVisible();
    
    // Should show category names from our test data
    const incomeCategory = testCategories.find(cat => cat.kind === 'INCOME');
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');
    
    if (incomeCategory) {
      await expect(page.locator(`text=${incomeCategory.name}`)).toBeVisible();
    }
    
    if (expenseCategory) {
      await expect(page.locator(`text=${expenseCategory.name}`)).toBeVisible();
    }
  });

  test('should filter reports by date range', async ({ page }) => {
    await page.goto('/reports');
    
    // Set date range filter
    await page.fill('input[name="dateFrom"], [data-testid="date-from"]', '2024-01-01');
    await page.fill('input[name="dateTo"], [data-testid="date-to"]', '2024-01-31');
    
    // Apply filter
    await page.click('button:has-text("Aplicar"), button:has-text("Apply"), [data-testid="apply-filter"]');
    
    await page.waitForTimeout(3000);
    
    // Report should update with filtered data
    await expect(page.locator('text=Enero, text=January, text=2024-01')).toBeVisible();
  });

  test('should show account-wise breakdown', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Should show account breakdown
    await expect(page.locator('text=Por Cuenta, text=By Account, text=Cuentas')).toBeVisible();
    
    // Should show our test account
    await expect(page.locator('text=Cuenta Reportes')).toBeVisible();
  });

  test('should display cash flow analysis', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Look for cash flow section
    await expect(page.locator('text=Flujo de Efectivo, text=Cash Flow, text=Flujo')).toBeVisible();
    
    // Should show net income/loss
    await expect(page.locator('text=Neto, text=Net, text=Balance')).toBeVisible();
    
    // With our test data: $8,000 income - $3,500 expenses = $4,500 net
    await expect(page.locator('text=$4,500, text=4500')).toBeVisible();
  });

  test('should export report data', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Look for export functionality
    const exportButton = page.locator('button:has-text("Exportar"), button:has-text("Export"), [data-testid="export-report"]');
    
    if (await exportButton.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      // Verify download started
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/report|reporte/i);
    }
  });

  test('should show period comparison', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Look for period comparison features
    await expect(page.locator('text=Comparación, text=Comparison, text=vs')).toBeVisible();
    
    // Should show percentage changes or growth indicators
    await expect(page.locator('text=%, text=crecimiento, text=growth, text=cambio')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Charts and reports should be visible on mobile
    await expect(page.locator('text=Reporte, text=Report')).toBeVisible();
    
    // Mobile-specific layout elements
    await expect(page.locator('.mobile, [data-testid="mobile-report"]')).toBeVisible();
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Clean up all test data to simulate empty state
    await dbUtils.cleanupAllTestData();
    
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Should show empty state message
    await expect(page.locator('text=Sin datos, text=No data, text=vacío, text=empty')).toBeVisible();
    
    // Should suggest creating transactions
    await expect(page.locator('text=transacciones, text=transactions')).toBeVisible();
  });

  test('should show spending trends over time', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Look for trend analysis
    await expect(page.locator('text=Tendencia, text=Trend, text=Evolución')).toBeVisible();
    
    // Should show time-based chart
    await expect(page.locator('canvas, svg, .chart-container')).toBeVisible();
  });

  test('should display budget vs actual spending', async ({ page }) => {
    await page.goto('/reports');
    
    await page.waitForTimeout(3000);
    
    // Look for budget comparison
    await expect(page.locator('text=Presupuesto, text=Budget, text=vs Real')).toBeVisible();
    
    // Should show budget performance indicators
    await expect(page.locator('text=Cumplido, text=Achieved, text=Excedido, text=Over')).toBeVisible();
  });
});



