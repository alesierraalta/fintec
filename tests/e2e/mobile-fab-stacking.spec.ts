import { expect, test } from '@playwright/test';

const mobileProjects = new Set(['Mobile Chrome', 'Mobile Safari']);

test.describe('Mobile FAB above footer stacking & geometry', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !mobileProjects.has(testInfo.project.name),
      'This suite only runs on mobile Playwright projects.'
    );
  });

  test('floating action button sits above the mobile navigation footer without overlap', async ({
    page,
  }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    const nav = page.getByTestId('mobile-nav');
    await expect(nav).toBeVisible({ timeout: 10000 });

    const fab = page.getByRole('button', { name: 'Nueva', exact: true });
    await expect(fab).toBeVisible({ timeout: 10000 });

    // 1. Verify stacking order: FAB z-index must be higher than MobileNav (z-[45])
    const navZIndex = await nav.evaluate(
      (el) => window.getComputedStyle(el).zIndex
    );
    const fabZIndex = await fab.evaluate(
      (el) => window.getComputedStyle(el).zIndex
    );

    expect(Number(navZIndex)).toBe(45);
    expect(Number(fabZIndex)).toBeGreaterThanOrEqual(50);

    // 2. Verify physical bounding box geometry: FAB bottom must sit strictly above the nav top
    const navBounds = await nav.boundingBox();
    const fabBounds = await fab.boundingBox();

    expect(navBounds).not.toBeNull();
    expect(fabBounds).not.toBeNull();

    // The bottom edge of the FAB (y + height) must be <= top edge of the footer (y)
    // with a comfortable margin (at least 8px clearance)
    const fabBottom = fabBounds!.y + fabBounds!.height;
    const navTop = navBounds!.y;

    expect(fabBottom).toBeLessThanOrEqual(navTop);
    expect(navTop - fabBottom).toBeGreaterThanOrEqual(8);

    // 3. Verify clickability: clicking the green FAB navigates to /transactions/add
    await fab.click();
    await expect(page).toHaveURL(/\/transactions\/add/);
  });

  test('floating action button sits above the mobile navigation footer on dashboard', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.getByTestId('mobile-nav');
    await expect(nav).toBeVisible({ timeout: 10000 });

    const fab = page.getByRole('button', { name: 'Nueva', exact: true });
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Stacking
    const navZIndex = await nav.evaluate(
      (el) => window.getComputedStyle(el).zIndex
    );
    const fabZIndex = await fab.evaluate(
      (el) => window.getComputedStyle(el).zIndex
    );
    expect(Number(navZIndex)).toBe(45);
    expect(Number(fabZIndex)).toBeGreaterThanOrEqual(50);

    // Geometry clearance
    const navBounds = await nav.boundingBox();
    const fabBounds = await fab.boundingBox();
    expect(navBounds).not.toBeNull();
    expect(fabBounds).not.toBeNull();

    const fabBottom = fabBounds!.y + fabBounds!.height;
    const navTop = navBounds!.y;
    expect(fabBottom).toBeLessThanOrEqual(navTop);
    expect(navTop - fabBottom).toBeGreaterThanOrEqual(8);
  });
});
