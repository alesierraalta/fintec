import { expect, test } from '@playwright/test';

const mobileProjects = new Set(['Mobile Chrome', 'Mobile Safari']);
test.describe('Mobile más opciones FAB regression', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !mobileProjects.has(testInfo.project.name),
      'This suite only runs on mobile Playwright projects.'
    );

    await page.goto('/dev/mobile-menu-fab-regression');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTitle('Más opciones')).toBeVisible({
      timeout: 15000,
    });
  });

  test('keeps the logo trigger visible, unclipped, and interactive', async ({
    page,
  }) => {
    const fab = page.getByTitle('Más opciones');
    const logo = fab.locator('img[alt="FinTec Menu"]');

    await expect(fab).toBeVisible();
    await expect(fab).toHaveAttribute('aria-label', 'Abrir menú');
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await expect(logo).toBeVisible();
    await expect(fab.locator('svg')).toHaveCount(0);

    const fabBounds = await fab.boundingBox();
    const logoBounds = await logo.boundingBox();
    expect(fabBounds).not.toBeNull();
    expect(logoBounds).not.toBeNull();
    expect(fabBounds!.height).toBeGreaterThanOrEqual(44);
    expect(fabBounds!.width).toBeGreaterThanOrEqual(44);
    expect(Math.abs(fabBounds!.width - fabBounds!.height)).toBeLessThanOrEqual(
      2
    );
    expect(fabBounds!.x).toBeGreaterThanOrEqual(0);
    expect(fabBounds!.x + fabBounds!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1
    );
    expect(fabBounds!.y + fabBounds!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height + 1
    );
    expect(logoBounds!.width).toBeLessThan(fabBounds!.width);
    expect(logoBounds!.height).toBeLessThan(fabBounds!.height);
    expect(logoBounds!.x).toBeGreaterThan(fabBounds!.x);
    expect(logoBounds!.y).toBeGreaterThan(fabBounds!.y);
    expect(logoBounds!.x + logoBounds!.width).toBeLessThan(
      fabBounds!.x + fabBounds!.width
    );
    expect(logoBounds!.y + logoBounds!.height).toBeLessThan(
      fabBounds!.y + fabBounds!.height
    );

    await expect(fab).toHaveScreenshot('mobile-menu-fab-trigger.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    });

    await fab.click();

    await expect(
      page.getByRole('dialog', { name: 'Más opciones' })
    ).toBeVisible();
    await expect(fab).toHaveAttribute('aria-label', 'Cerrar menú');
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
  });
});
