import { expect, test, type Page } from '@playwright/test';
import { getCanonicalTestUserConfig } from '../support/auth/canonical-user';

const mobileProjects = new Set(['Mobile Chrome', 'Mobile Safari']);
const canonicalUser = getCanonicalTestUserConfig();
const mobileNavLabels = [
  'Inicio',
  'Cuentas',
  'Transacciones',
  'Transferir',
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
    await expect(
      page.getByRole('link', { name: 'Descargar APK Android Beta' })
    ).toBeVisible();
    await expect(page.getByAltText('FinTec')).toBeVisible();
    await expect(page.getByLabel('Abrir menú de usuario')).toBeVisible();

    await expectNoHorizontalOverflow(page);

    const nav = page.getByRole('navigation', {
      name: 'Navegación móvil principal',
    });
    const navBox = await nav.boundingBox();

    expect(navBox).not.toBeNull();
    expect(navBox!.height).toBeGreaterThanOrEqual(44);
    expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height + 1
    );

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
    const drawerTrigger = page.getByRole('button', {
      name: 'Abrir menú',
      exact: true,
    });
    const userMenuTrigger = page.getByLabel('Abrir menú de usuario');

    await drawerTrigger.click();
    const drawer = page.getByRole('dialog', { name: 'Más opciones' });
    await expect(drawer).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await drawer.getByRole('button', { name: 'Cerrar menú' }).click();
    await expect(drawer).toBeHidden();

    await userMenuTrigger.click();
    await expect(page.getByRole('button', { name: 'Perfil' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page
      .getByRole('button', { name: 'Cerrar menú de usuario' })
      .last()
      .click();
    await expect(page.getByRole('button', { name: 'Perfil' })).toHaveCount(0);
  });
});
