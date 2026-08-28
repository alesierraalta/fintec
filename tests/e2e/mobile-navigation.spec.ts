import { expect, test } from '@playwright/test';

const mobileProjects = new Set(['Mobile Chrome', 'Mobile Safari']);

test.describe('mobile navigation back regressions', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!mobileProjects.has(testInfo.project.name), 'Mobile projects only.');
    await page.goto('/dev/mobile-menu-fab-regression');
    await page.waitForLoadState('networkidle');
  });

  test('opens and closes the mobile drawer without changing the browser location', async ({
    page,
  }) => {
    const locationBeforeOpen = page.url();
    const trigger = page.getByTitle('Más opciones');

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Más opciones' })).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(page.url()).toBe(locationBeforeOpen);

    await page.getByRole('button', { name: 'Cerrar menú' }).click();
    await expect(page.getByRole('dialog', { name: 'Más opciones' })).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(page.url()).toBe(locationBeforeOpen);
  });

  test('keeps the drawer closed after a fresh browser reload', async ({ page }) => {
    const trigger = page.getByTitle('Más opciones');
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Más opciones' })).toBeVisible();

    await page.reload();
    await expect(page.getByTitle('Más opciones')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('dialog', { name: 'Más opciones' })).toBeHidden();
  });
});
