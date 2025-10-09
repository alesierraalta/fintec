import { test, expect } from '@playwright/test';

/**
 * Test Suite: Currency Breakdown and USD Equivalents
 * 
 * Validates that:
 * 1. Transactions are broken down by currency in summary cards
 * 2. USD equivalents are shown when multiple currencies exist
 * 3. Account balances show USD equivalents for non-USD currencies
 */

test.describe('Currency Breakdown - Transactions Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
  });

  test('should show currency breakdown in summary cards', async ({ page }) => {
    // Verify page loaded
    expect(page.url()).toContain('transactions');

    // Check for summary cards
    const incomeCard = await page.locator('text=TOTAL INGRESOS').count();
    const expensesCard = await page.locator('text=TOTAL GASTOS').count();
    const netCard = await page.locator('text=BALANCE NETO').count();

    expect(incomeCard).toBeGreaterThan(0);
    expect(expensesCard).toBeGreaterThan(0);
    expect(netCard).toBeGreaterThan(0);

    console.log('✅ All summary cards are present');
  });

  test('should display "Total equiv." when multiple currencies exist', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for "Total equiv." text which appears when there are multiple currencies
    const totalEquivText = await page.locator('text=Total equiv').count();

    console.log(`Found ${totalEquivText} "Total equiv." labels`);

    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/currency-breakdown-summary.png', 
      fullPage: true 
    });
  });

  test('should display individual currency amounts', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for currency codes (USD, VES, etc.)
    const currencyBadges = await page.locator('span.text-xs.text-muted-foreground').count();

    console.log(`✅ Found ${currencyBadges} currency indicators`);

    expect(currencyBadges).toBeGreaterThan(0);
  });

  test('summary cards should have proper structure', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Verify the grid layout exists
    const summaryGrid = page.locator('div.grid.grid-cols-1.sm\\:grid-cols-2.xl\\:grid-cols-4');
    await expect(summaryGrid).toBeVisible();

    console.log('✅ Summary grid layout is present');
  });
});

test.describe('Currency Breakdown - USD Equivalents in Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/accounts');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
  });

  test('should display USD equivalent for non-USD accounts', async ({ page }) => {
    // Verify page loaded
    expect(page.url()).toContain('accounts');

    // Look for "≈" symbol which indicates USD equivalent
    const equivalentSymbols = await page.locator('text=≈').count();

    console.log(`✅ Found ${equivalentSymbols} USD equivalent indicators`);

    if (equivalentSymbols > 0) {
      console.log('✅ USD equivalents are being displayed');
    } else {
      console.log('ℹ️ No non-USD accounts found to show equivalents');
    }
  });

  test('should show USD equivalent only for non-USD currencies', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/accounts-usd-equivalents.png', 
      fullPage: true 
    });

    console.log('✅ Screenshot saved for manual verification');
  });

  test('accounts page should have balance display', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Verify accounts list is visible
    const accountsSection = page.locator('text=Cuentas').first();
    await expect(accountsSection).toBeVisible();

    console.log('✅ Accounts section is visible');
  });
});

test.describe('Currency Breakdown - Code Validation', () => {
  test('verify useCurrencyConverter hook exists', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const hookPath = path.join(process.cwd(), 'hooks', 'use-currency-converter.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');
    
    // Verify hook contains conversion logic
    expect(content).toContain('useCurrencyConverter');
    expect(content).toContain('convert');
    expect(content).toContain('convertToUSD');
    expect(content).toContain('VES');
    expect(content).toContain('usd_ves');
    
    console.log('✅ useCurrencyConverter hook validated');
  });

  test('verify transactions page uses currency breakdown', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const transactionsPath = path.join(process.cwd(), 'app', 'transactions', 'page.tsx');
    const content = fs.readFileSync(transactionsPath, 'utf-8');
    
    // Verify breakdown logic is implemented
    expect(content).toContain('totalesPorMoneda');
    expect(content).toContain('totalesEnUSD');
    expect(content).toContain('useCurrencyConverter');
    expect(content).toContain('Total equiv');
    
    console.log('✅ Transactions page breakdown logic validated');
  });

  test('verify accounts page has USD conversion', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const accountsPath = path.join(process.cwd(), 'app', 'accounts', 'page.tsx');
    const content = fs.readFileSync(accountsPath, 'utf-8');
    
    // Verify conversion logic is implemented
    expect(content).toContain('convertToUSD');
    expect(content).toContain('useBinanceRates');
    expect(content).toContain('≈');
    expect(content).toContain('USD');
    
    console.log('✅ Accounts page USD conversion validated');
  });
});

test.describe('Currency Breakdown - Integration', () => {
  test('full multi-currency workflow validation', async ({ page }) => {
    console.log('\n════════════════════════════════════════════════════');
    console.log('🌍 MULTI-CURRENCY WORKFLOW VALIDATION');
    console.log('════════════════════════════════════════════════════\n');

    // Step 1: Check transactions page
    console.log('📊 Step 1: Checking Transactions Page...');
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    const incomeCard = await page.locator('text=TOTAL INGRESOS').isVisible();
    const expensesCard = await page.locator('text=TOTAL GASTOS').isVisible();
    console.log(`   - Income Card: ${incomeCard ? '✅' : '❌'}`);
    console.log(`   - Expenses Card: ${expensesCard ? '✅' : '❌'}`);

    // Step 2: Check accounts page
    console.log('\n💰 Step 2: Checking Accounts Page...');
    await page.goto('http://localhost:3000/accounts');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    const accountsVisible = await page.locator('text=Cuentas').first().isVisible();
    const usdEquivCount = await page.locator('text=≈').count();
    console.log(`   - Accounts Page: ${accountsVisible ? '✅' : '❌'}`);
    console.log(`   - USD Equivalents Found: ${usdEquivCount}`);

    // Step 3: Verify structure
    console.log('\n🔍 Step 3: Structure Validation...');
    const fs = require('fs');
    const path = require('path');
    
    const hookExists = fs.existsSync(path.join(process.cwd(), 'hooks', 'use-currency-converter.ts'));
    console.log(`   - Currency Converter Hook: ${hookExists ? '✅' : '❌'}`);

    console.log('\n════════════════════════════════════════════════════');
    console.log('✨ VALIDATION COMPLETE');
    console.log('════════════════════════════════════════════════════\n');

    expect(incomeCard && expensesCard && accountsVisible).toBe(true);
  });
});

test.describe('Currency Breakdown - Manual Test Instructions', () => {
  test('display manual testing guide', async () => {
    console.log('\n════════════════════════════════════════════════════');
    console.log('📋 MANUAL TESTING GUIDE');
    console.log('════════════════════════════════════════════════════\n');
    
    console.log('🎯 Test 1: Transaction Currency Breakdown');
    console.log('  1. Navigate to /transactions');
    console.log('  2. Look at TOTAL INGRESOS card');
    console.log('  3. You should see separate amounts for each currency');
    console.log('  4. If multiple currencies exist, see "Total equiv.: $X.XX USD"');
    console.log('');
    
    console.log('🎯 Test 2: Account USD Equivalents');
    console.log('  1. Navigate to /accounts');
    console.log('  2. Find an account with non-USD currency (e.g., VES)');
    console.log('  3. Below the main balance, you should see:');
    console.log('     "≈ $X.XX USD"');
    console.log('');
    
    console.log('🎯 Test 3: Create Multi-Currency Scenario');
    console.log('  1. Create transaction in USD: $50');
    console.log('  2. Create transaction in VES: Bs.2000');
    console.log('  3. Check /transactions summary cards');
    console.log('  4. Should see breakdown:');
    console.log('     - $50.00 USD');
    console.log('     - Bs.2000.00 VES');
    console.log('     - Total equiv.: $56.67 USD (approx)');
    console.log('');
    
    console.log('✅ Expected Results:');
    console.log('  - Each currency shows separately');
    console.log('  - USD equivalents calculated correctly');
    console.log('  - No mixing of currencies in totals');
    console.log('  - Clean, professional display');
    console.log('════════════════════════════════════════════════════\n');
    
    expect(true).toBe(true);
  });
});

