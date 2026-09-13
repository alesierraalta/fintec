import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'artifacts', 'screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.describe('Home Page Visual & Console Audit', () => {
  test('Desktop Home audit (dashboard or landing)', async ({ page }) => {
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'home-desktop-full.png'),
      fullPage: true,
    });

    // Check for "NaN" or "undefined" in rendered text
    const pageText = await page.innerText('body');
    const nanMatches = pageText.match(/\b(NaN|undefined|null)\b/g);

    console.log('Console issues found:', consoleErrors);
    console.log('NaN or undefined in page:', nanMatches);

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'home-audit-report.json'),
      JSON.stringify(
        {
          consoleLogs,
          consoleErrors,
          nanMatches,
        },
        null,
        2
      )
    );
  });

  test('Mobile Home audit (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'home-mobile-full.png'),
      fullPage: true,
    });
  });
});
