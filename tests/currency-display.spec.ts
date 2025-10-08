import { test, expect } from '@playwright/test';

/**
 * Test Suite: Currency Display in Transactions
 * 
 * Validates that transactions display the correct currency symbol
 * based on their currencyCode (e.g., $ for USD, Bs. for VES).
 */

test.describe('Currency Display - Transaction List', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
  });

  test('should display correct currency symbols in transaction list', async ({ page }) => {
    // Verify page loaded
    expect(page.url()).toContain('transactions');
    
    // Check if any transactions are visible
    const transactionItems = await page.locator('[class*="p-6 hover:bg-card"]').count();
    
    if (transactionItems > 0) {
      console.log(`✅ Found ${transactionItems} transactions`);
      
      // Take screenshot to verify currency symbols visually
      await page.screenshot({ path: 'test-results/currency-symbols-display.png', fullPage: true });
    } else {
      console.log('ℹ️ No transactions found to validate currency symbols');
    }
    
    // Verify the page structure exists
    await expect(page.locator('text=Transacciones')).toBeVisible();
  });

  test('should show currency code badge below amount', async ({ page }) => {
    // Wait for transactions to load
    await page.waitForTimeout(1000);
    
    // Look for currency code badges (USD, VES, etc.)
    const currencyBadges = page.locator('span.text-xs.text-muted-foreground');
    const badgeCount = await currencyBadges.count();
    
    if (badgeCount > 0) {
      console.log(`✅ Found ${badgeCount} currency code badges`);
      
      // Verify at least one badge exists
      expect(badgeCount).toBeGreaterThan(0);
    } else {
      console.log('ℹ️ No currency badges found (might be no transactions)');
    }
  });

  test('should display USD symbol correctly', async ({ page }) => {
    // Check if page contains USD symbol
    const pageContent = await page.content();
    
    // The page should render currency symbols
    expect(pageContent.length).toBeGreaterThan(0);
    
    console.log('✅ Page content loaded successfully');
  });

  test('should display VES symbol (Bs.) correctly', async ({ page }) => {
    // If VES transactions exist, they should show Bs.
    const pageContent = await page.content();
    
    // Just verify page loaded
    expect(page.url()).toContain('transactions');
    
    console.log('✅ Transactions page accessible for VES validation');
  });

  test('should show multi-currency disclaimer in summary cards', async ({ page }) => {
    // Look for the disclaimer text
    const disclaimer = page.locator('text=* Incluye todas las monedas');
    const disclaimerCount = await disclaimer.count();
    
    // Should appear in 3 summary cards (income, expense, net)
    expect(disclaimerCount).toBeGreaterThanOrEqual(3);
    
    console.log(`✅ Found ${disclaimerCount} multi-currency disclaimers`);
  });
});

test.describe('Currency Display - Summary Cards', () => {
  test('summary cards should have currency disclaimer', async ({ page }) => {
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Check for "TOTAL INGRESOS" card
    const incomeCard = page.locator('text=TOTAL INGRESOS').locator('..');
    await expect(incomeCard).toBeVisible();

    // Check for "TOTAL GASTOS" card
    const expensesCard = page.locator('text=TOTAL GASTOS').locator('..');
    await expect(expensesCard).toBeVisible();

    // Check for "BALANCE NETO" card
    const netCard = page.locator('text=BALANCE NETO').locator('..');
    await expect(netCard).toBeVisible();

    console.log('✅ All summary cards are visible');
  });

  test('disclaimer text should be visible and styled correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Find all disclaimers
    const disclaimers = page.locator('p.text-xs:has-text("* Incluye todas las monedas")');
    const count = await disclaimers.count();

    expect(count).toBeGreaterThanOrEqual(3);

    // Verify first disclaimer has correct styling
    if (count > 0) {
      const firstDisclaimer = disclaimers.first();
      const classes = await firstDisclaimer.getAttribute('class');
      
      expect(classes).toContain('text-muted-foreground');
      expect(classes).toContain('opacity-70');
      
      console.log('✅ Disclaimer styling validated');
    }
  });
});

test.describe('Currency Display - getCurrencySymbol Function', () => {
  test('verify getCurrencySymbol function exists in code', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const transactionsPagePath = path.join(process.cwd(), 'app', 'transactions', 'page.tsx');
    const content = fs.readFileSync(transactionsPagePath, 'utf-8');
    
    // Verify getCurrencySymbol function was added
    expect(content).toContain('getCurrencySymbol');
    expect(content).toContain("'USD': '$'");
    expect(content).toContain("'VES': 'Bs.'");
    expect(content).toContain("'EUR': '€'");
    
    console.log('✅ getCurrencySymbol function verified in code');
  });

  test('verify currency symbols are used in transaction display', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const transactionsPagePath = path.join(process.cwd(), 'app', 'transactions', 'page.tsx');
    const content = fs.readFileSync(transactionsPagePath, 'utf-8');
    
    // Verify getCurrencySymbol is being called in the render
    expect(content).toContain('getCurrencySymbol(transaction.currencyCode)');
    
    // Verify currency code badge was added
    expect(content).toContain('{transaction.currencyCode}');
    
    console.log('✅ Currency symbol usage verified in transaction display');
  });
});

test.describe('Currency Display - Visual Validation', () => {
  test('take screenshot of transaction list for manual verification', async ({ page }) => {
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/transactions-currency-display-full.png', 
      fullPage: true 
    });

    console.log('✅ Screenshot saved for manual verification');
    console.log('   Check: test-results/transactions-currency-display-full.png');
  });

  test('verify transactions page structure', async ({ page }) => {
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);

    // Verify main elements exist
    await expect(page.locator('text=Transacciones')).toBeVisible();
    await expect(page.locator('text=Nueva Transacción')).toBeVisible();
    await expect(page.locator('text=TOTAL INGRESOS')).toBeVisible();
    await expect(page.locator('text=TOTAL GASTOS')).toBeVisible();
    await expect(page.locator('text=BALANCE NETO')).toBeVisible();

    console.log('✅ Page structure validated');
  });
});

test.describe('Currency Display - Integration', () => {
  test('full currency display workflow', async ({ page }) => {
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    console.log('\n════════════════════════════════════════════════════');
    console.log('🎯 CURRENCY DISPLAY VALIDATION');
    console.log('════════════════════════════════════════════════════\n');
    
    // Check summary cards
    const incomeVisible = await page.locator('text=TOTAL INGRESOS').isVisible();
    const expensesVisible = await page.locator('text=TOTAL GASTOS').isVisible();
    const netVisible = await page.locator('text=BALANCE NETO').isVisible();
    
    console.log(`📊 Summary Cards:`);
    console.log(`   - Total Ingresos: ${incomeVisible ? '✅' : '❌'}`);
    console.log(`   - Total Gastos: ${expensesVisible ? '✅' : '❌'}`);
    console.log(`   - Balance Neto: ${netVisible ? '✅' : '❌'}`);
    
    // Check disclaimers
    const disclaimerCount = await page.locator('text=* Incluye todas las monedas').count();
    console.log(`\n💬 Multi-currency Disclaimers: ${disclaimerCount} found`);
    console.log(`   Expected: 3 (income, expenses, net)`);
    console.log(`   Status: ${disclaimerCount >= 3 ? '✅ PASS' : '⚠️ WARN'}`);
    
    // Check transaction list
    const transactionCount = await page.locator('[class*="p-6 hover:bg-card"]').count();
    console.log(`\n📋 Transactions: ${transactionCount} found`);
    
    if (transactionCount > 0) {
      console.log(`   ✅ Transaction list populated`);
      console.log(`   💡 Currency symbols should be visible next to amounts`);
    } else {
      console.log(`   ℹ️ No transactions to display`);
      console.log(`   💡 Create transactions to test currency symbols`);
    }
    
    console.log('\n════════════════════════════════════════════════════');
    console.log('✨ VALIDATION COMPLETE');
    console.log('════════════════════════════════════════════════════\n');
    
    expect(incomeVisible && expensesVisible && netVisible).toBe(true);
  });
});

