import { test, expect } from '@playwright/test';

test.describe('Transaction Amounts Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto('http://localhost:3000/transactions');
    await page.waitForLoadState('networkidle');
  });

  test('should display transaction amounts correctly (no NaN)', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check for transaction amount elements
    const amountElements = await page.locator('[data-testid*="amount"], .amount, .transaction-amount').all();
    console.log('Amount elements found:', amountElements.length);

    // Check each amount element for NaN
    for (const element of amountElements) {
      const text = await element.textContent();
      console.log('Amount text:', text);
      
      // Should not contain NaN
      expect(text).not.toContain('NaN');
      
      // Should contain valid currency format
      if (text && text.includes('$')) {
        expect(text).toMatch(/\$\d+\.\d{2}/);
      }
    }
  });

  test('should display recent transactions correctly', async ({ page }) => {
    // Navigate to dashboard to check recent transactions
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for recent transaction amounts
    const recentAmounts = await page.locator('.recent-transactions .amount, [data-testid*="recent"] .amount').all();
    console.log('Recent transaction amounts found:', recentAmounts.length);

    for (const element of recentAmounts) {
      const text = await element.textContent();
      console.log('Recent amount text:', text);
      
      // Should not contain NaN
      expect(text).not.toContain('NaN');
      
      // Should contain valid currency format
      if (text && text.includes('$')) {
        expect(text).toMatch(/\$\d+\.\d{2}/);
      }
    }
  });

  test('should handle edge cases in amount formatting', async ({ page }) => {
    // Check console for any amount-related errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('amount')) {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for console errors
    console.log('Amount-related console errors:', consoleErrors);
    expect(consoleErrors.length).toBe(0);
  });

  test('should display summary totals correctly', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check for summary total elements
    const totalElements = await page.locator('[data-testid*="total"], .total, .summary-total').all();
    console.log('Total elements found:', totalElements.length);

    for (const element of totalElements) {
      const text = await element.textContent();
      console.log('Total text:', text);
      
      // Should not contain NaN
      expect(text).not.toContain('NaN');
      
      // Should contain valid currency format
      if (text && text.includes('$')) {
        expect(text).toMatch(/\$\d+\.\d{2}/);
      }
    }
  });
});
