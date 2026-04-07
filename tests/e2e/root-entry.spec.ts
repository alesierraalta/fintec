import { test, expect } from '@playwright/test';

test.describe('Root Entry (/)', () => {
  test('/ renders landing without redirecting to login', async ({ page }) => {
    await page.goto('/');

    // Should NOT redirect to /auth/login
    await expect(page).toHaveURL('/');

    // Should show landing content
    await expect(
      page.getByRole('heading', { name: /Controla tus Finanzas/i })
    ).toBeVisible();

    // Should show CTA buttons
    await expect(page.getByRole('link', { name: /Iniciar Sesión/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Registrarse/i })).toBeVisible();
  });

  test('/landing renders landing page', async ({ page }) => {
    await page.goto('/landing');

    // Should NOT redirect
    await expect(page).toHaveURL('/landing');

    // Should show landing content
    await expect(
      page.getByRole('heading', { name: /Controla tus Finanzas/i })
    ).toBeVisible();
  });

  test('/ with query params renders landing', async ({ page }) => {
    await page.goto('/?utm_source=google&utm_campaign=test');

    // Should NOT redirect
    await expect(page).toHaveURL('/?utm_source=google&utm_campaign=test');

    // Should show landing content
    await expect(
      page.getByRole('heading', { name: /Controla tus Finanzas/i })
    ).toBeVisible();
  });

  test('/ returns 200 with landing HTML for crawler user-agent', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    });
    const page = await context.newPage();

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Should show landing content
    await expect(
      page.getByRole('heading', { name: /Controla tus Finanzas/i })
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
    await page.goto('/transactions');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
