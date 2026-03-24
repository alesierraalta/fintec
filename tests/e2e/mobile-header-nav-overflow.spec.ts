import { expect, test, type Page } from '@playwright/test';
import { getCanonicalTestUserConfig } from '../support/auth/canonical-user';

const mobileProjects = new Set(['Mobile Chrome', 'Mobile Safari']);
const canonicalUser = getCanonicalTestUserConfig();
const mobileNavLabels = [
  'Inicio',
  'Cuentas',
  'Gastos',
  'Transferir',
  'Deudas',
  'Metas',
];

async function getHorizontalMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');

    return {
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      rootScrollWidth: root?.scrollWidth ?? 0,
    };
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await getHorizontalMetrics(page);

  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(
    metrics.innerWidth + 1
  );
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

async function ensureAuthenticatedShell(page: Page) {
  await page.goto('/');

  if (page.url().includes('/auth/login')) {
    await page.fill('input[name="email"]', canonicalUser.email);
    await page.fill('input[name="password"]', canonicalUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'));
  }
}

test.describe('Mobile header and nav overflow regression', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !mobileProjects.has(testInfo.project.name),
      'This suite only runs on mobile Playwright projects.'
    );

    await ensureAuthenticatedShell(page);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Navegación móvil principal' })
    ).toBeVisible();
  });

  test('keeps header controls and mobile nav contained on narrow viewports', async ({
    page,
  }) => {
    await expect(page.getByTitle('Seleccionar fuente de tasa')).toBeVisible();
    await expect(page.getByAltText('FinTec Logo')).toBeVisible();
    await expect(page.getByLabel('Abrir menú de usuario')).toBeVisible();

    await expectNoHorizontalOverflow(page);

    const nav = page.getByRole('navigation', {
      name: 'Navegación móvil principal',
    });
    const navBox = await nav.boundingBox();
    const navPaddingBottom = await nav.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingBottom)
    );

    expect(navBox).not.toBeNull();
    expect(navPaddingBottom).toBeGreaterThanOrEqual(12);

    const linkBoxes = [] as NonNullable<
      Awaited<ReturnType<typeof nav.boundingBox>>
    >[];

    for (const label of mobileNavLabels) {
      const link = nav.getByRole('link', { name: label });
      await expect(link).toBeVisible();

      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThan(40);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        page.viewportSize()!.width + 1
      );

      linkBoxes.push(box!);
    }

    for (let index = 1; index < linkBoxes.length; index += 1) {
      expect(linkBoxes[index].x).toBeGreaterThanOrEqual(
        linkBoxes[index - 1].x + linkBoxes[index - 1].width - 1
      );
    }
  });

  test('keeps overlays interactive without introducing horizontal reflow', async ({
    page,
  }) => {
    const rateTrigger = page.getByTitle('Seleccionar fuente de tasa');
    const userMenuTrigger = page.getByLabel('Abrir menú de usuario');

    await rateTrigger.click();
    await expect(page.getByText('BCV USD')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('[data-overlay-backdrop="rate-selector"]').click();
    await expect(page.getByText('BCV USD')).toHaveCount(0);

    await userMenuTrigger.click();
    await expect(page.getByText('Mi Perfil')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('[data-overlay-backdrop="mobile-user-menu"]').click();
    await expect(page.getByText('Mi Perfil')).toHaveCount(0);
  });
});
