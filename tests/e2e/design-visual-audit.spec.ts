import { expect, test } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const isNoAuthBypassMode = ['1', 'true', 'yes'].includes(
  (process.env.FRONTEND_AUTH_BYPASS ?? '').toLowerCase()
);
const isNoAuthSetupMode = ['1', 'true', 'yes'].includes(
  (process.env.PLAYWRIGHT_NO_AUTH_SETUP ?? '').toLowerCase()
);
const lane = process.env.PLAYWRIGHT_LANE ?? 'no-auth';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'artifacts', 'screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.describe('Visual & UX Design Audit', () => {
  test.skip(
    lane !== 'no-auth',
    'This suite only runs in PLAYWRIGHT_LANE=no-auth.'
  );

  test.skip(
    !isNoAuthSetupMode,
    'Run this suite with PLAYWRIGHT_NO_AUTH_SETUP enabled.'
  );

  test('Settings Page - Versión y Actualizaciones visual design audit', async ({
    page,
  }, testInfo) => {
    test.skip(
      !isNoAuthBypassMode,
      'Bypass route checks require FRONTEND_AUTH_BYPASS enabled.'
    );

    await page.route('/api/app/version', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          latestVersionName: '1.0.2',
          latestVersionCode: 3,
          minRequiredVersionCode: 1,
          apkUrl: '/fintec-beta.apk',
          releaseNotes:
            'Novedades: Flujo Scan-to-Confirm en 1 tap, cámara directa, pegado de portapapeles, visor con zoom y mejoras de rendimiento.',
          publishedAt: '2026-09-12T00:00:00Z',
        }),
      });
    });

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings$/);

    const versionCard = page.locator("[data-testid='version-updates-card']");
    await expect(versionCard).toBeVisible({ timeout: 15000 });

    const projectName = testInfo.project.name
      .toLowerCase()
      .replace(/\s+/g, '-');
    await versionCard.screenshot({
      path: path.join(
        SCREENSHOTS_DIR,
        `settings-version-card-${projectName}.png`
      ),
    });

    const cardText = (await versionCard.textContent()) || '';
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
    expect(emojiRegex.test(cardText)).toBe(false);
  });

  test('Batch Receipt Uploader Modal visual design audit', async ({
    page,
  }, testInfo) => {
    test.skip(
      !isNoAuthBypassMode,
      'Bypass route checks require FRONTEND_AUTH_BYPASS enabled.'
    );

    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/transactions$/);

    const projectName = testInfo.project.name
      .toLowerCase()
      .replace(/\s+/g, '-');

    const batchBtn = page
      .locator("button[aria-label='Cargar lote de comprobantes']")
      .first();
    if (await batchBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await batchBtn.click();
      await page.waitForTimeout(1000);

      const modal = page.locator("[role='dialog']").first();
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await modal.screenshot({
          path: path.join(SCREENSHOTS_DIR, `batch-modal-${projectName}.png`),
        });
      }
    }
  });

  test('Transactions Page & Direct Add Route visual design audit', async ({
    page,
  }, testInfo) => {
    test.skip(
      !isNoAuthBypassMode,
      'Bypass route checks require FRONTEND_AUTH_BYPASS enabled.'
    );

    const projectName = testInfo.project.name
      .toLowerCase()
      .replace(/\s+/g, '-');

    await page.goto('/transactions/add');
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: path.join(
        SCREENSHOTS_DIR,
        `transactions-add-route-${projectName}.png`
      ),
      fullPage: false,
    });
  });
});
