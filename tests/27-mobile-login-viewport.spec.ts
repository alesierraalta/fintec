import { expect, test } from '@playwright/test';

const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password#access_token=test-access&refresh_token=test-refresh',
];

test.describe('Auth viewport-safe min-height behavior', () => {
  test('uses min-h-dynamic-screen on all targeted auth routes in mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    for (const route of authRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const dynamicMinHeightContainer = page
        .locator('div.min-h-dynamic-screen')
        .first();
      await expect(dynamicMinHeightContainer).toBeVisible();

      const legacyScreenContainer = page.locator('div.min-h-screen');
      await expect(legacyScreenContainer).toHaveCount(0);
    }
  });

  test('keeps desktop auth layout behavior unchanged across targeted routes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    for (const route of authRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const formContainer = page.locator('div.w-full.max-w-md').first();
      await expect(formContainer).toBeVisible();
    }
  });
});
