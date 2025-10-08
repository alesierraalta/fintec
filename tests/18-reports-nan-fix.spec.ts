import { test, expect } from '@playwright/test';

test.describe('Reports $NaN Fix Verification', () => {
  test('should not show $NaN in reports page', async ({ page }) => {
    // Navigate to reports
    await page.goto('http://localhost:3000/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Get all text content
    const bodyText = await page.textContent('body');
    
    // Should not contain NaN
    expect(bodyText).not.toContain('$NaN');
    expect(bodyText).not.toContain('NaN');

    console.log('✅ No $NaN found in reports page');
  });

  test('should display transaction amounts correctly in reports', async ({ page }) => {
    await page.goto('http://localhost:3000/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find all elements with $ symbol
    const amounts = await page.evaluate(() => {
      const results: string[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.includes('$')) {
          results.push(text);
        }
      }
      return results;
    });

    console.log('Found amounts:', amounts);

    // Check that none contain NaN
    for (const amount of amounts) {
      expect(amount).not.toContain('NaN');
    }

    console.log('✅ All amounts are valid');
  });

  test('should display recent transactions in reports without NaN', async ({ page }) => {
    await page.goto('http://localhost:3000/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for "Transacciones Recientes" section
    const recentTransactionsSection = page.locator('text=Transacciones Recientes').first();
    await expect(recentTransactionsSection).toBeVisible();

    // Get text content of the section
    const sectionText = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h3'))
        .find(h => h.textContent?.includes('Transacciones Recientes'));
      
      if (!heading) return 'Section not found';
      
      // Get the parent container
      const container = heading.closest('div');
      return container?.textContent || 'Container not found';
    });

    console.log('Recent transactions section text length:', sectionText.length);
    
    // Should not contain NaN
    expect(sectionText).not.toContain('$NaN');
    expect(sectionText).not.toContain('NaN');

    console.log('✅ Recent transactions section has no NaN');
  });
});
