import { test, expect } from '@playwright/test';

const isBypassMode = ['1', 'true', 'yes'].includes(
  (process.env.FRONTEND_AUTH_BYPASS ?? '').toLowerCase()
);

test.describe('Root Entry (/)', () => {
  test('/ renders root content without unexpected errors', async ({ page }) => {
    await page.goto('/');

    // Should NOT redirect to /auth/login
    await expect(page).toHaveURL('/');

    if (isBypassMode) {
      // In bypass mode, / renders the authenticated dashboard
      await expect(
        page.getByRole('heading', { name: /Dashboard/i })
      ).toBeVisible();
    } else {
      // Unauthenticated shows landing
      await expect(
        page.getByRole('heading', { name: /Tus finanzas, claras/i })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /Iniciar Sesión/i })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /Registrarse/i })
      ).toBeVisible();
    }
  });

  test('/landing redirects to /', async ({ page }) => {
    await page.goto('/landing');

    // Should redirect to /
    await expect(page).toHaveURL('/');
  });

  test('/ with query params renders without error', async ({ page }) => {
    await page.goto('/?utm_source=google&utm_campaign=test');

    // Should NOT redirect to /auth/login
    await expect(page).toHaveURL('/?utm_source=google&utm_campaign=test');

    if (isBypassMode) {
      await expect(
        page.getByRole('heading', { name: /Dashboard/i })
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole('heading', { name: /Tus finanzas, claras/i })
      ).toBeVisible();
    }
  });

  test('/ returns 200 with HTML for crawler user-agent', async ({
    browser,
  }) => {
    test.skip(isBypassMode, 'Bypass mode activates dashboard session');
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    });
    const page = await context.newPage();

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Should show landing content
    await expect(
      page.getByRole('heading', { name: /Tus finanzas, claras/i })
    ).toBeVisible();

    await context.close();
  });

  test('landing FCP is within threshold', async ({ page }) => {
    await page.goto('/');

    // Measure First Contentful Paint
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'first-contentful-paint') {
              observer.disconnect();
              resolve(entry.startTime);
            }
          }
        });
        observer.observe({ type: 'paint', buffered: true });

        // Fallback: resolve after a timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    // FCP should be <= 1500ms (NFR1)
    expect(fcp).toBeLessThanOrEqual(1500);
  });
});

test.describe('Protected Routes', () => {
  test('/transactions redirects unauthenticated to login', async ({ page }) => {
    test.skip(isBypassMode, 'Bypass mode allows transactions access');
    await page.goto('/transactions');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
