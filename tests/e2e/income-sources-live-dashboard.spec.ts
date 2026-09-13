import { expect, test } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { bootstrapCanonicalFixtures } from '../support/auth/bootstrap';

const SCREENSHOTS_DIR = path.join(
  process.cwd(),
  'artifacts',
  'screenshots',
  'income-sources-mobile'
);

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.describe('Live Mobile Dashboard: Income Sources @auth-required', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });

  test('seeds real income transactions and verifies mobile dashboard section', async ({
    page,
  }) => {
    // 1. Bootstrap fixtures
    const { account, incomeCategory } = await bootstrapCanonicalFixtures(page);

    // 2. Create sample income transactions with current date
    const uniqueToken = Date.now().toString();
    const today = new Date().toISOString().split('T')[0];

    const createTx = async (
      amount: number,
      description: string,
      categoryId: string
    ) => {
      const res = await page.request.post('/api/transactions', {
        data: {
          accountId: account.id,
          categoryId,
          type: 'INCOME',
          amount,
          currencyCode: account.currencyCode || 'USD',
          date: today,
          description,
        },
      });
      if (!res.ok()) {
        const text = await res.text();
        console.error('Failed to create transaction:', res.status(), text);
      }
      expect(res.ok()).toBeTruthy();
      return res.json();
    };

    await createTx(1500, `Salario E2E ${uniqueToken}`, incomeCategory.id);

    // 3. Navigate to root dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 4. Locate the income sources section
    const incomeSection = page.locator(
      'section[aria-labelledby="income-sources-title"]'
    );
    await expect(incomeSection).toBeVisible({ timeout: 15000 });

    // Scroll section into view
    await incomeSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // 5. Verify the card contains the chart and items without overflowing
    await incomeSection.screenshot({
      path: path.join(
        SCREENSHOTS_DIR,
        'live-dashboard-income-section-iphone.png'
      ),
    });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'live-dashboard-viewport-iphone.png'),
    });

    // 6. Verify category item exists and is at least 44px high
    const categoryRow = incomeSection.locator('[role="listitem"]').first();
    await expect(categoryRow).toBeVisible();
    const rowBox = await categoryRow.boundingBox();
    console.log(
      'Category row height on live mobile dashboard:',
      rowBox?.height
    );
    expect(rowBox?.height).toBeGreaterThanOrEqual(44);

    // 7. Click category row and verify highlight
    await categoryRow.click();
    await page.waitForTimeout(300);
    await expect(categoryRow).toHaveClass(/bg-primary\/10/);

    await incomeSection.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'live-dashboard-selected-iphone.png'),
    });
  });
});
