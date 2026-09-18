import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'artifacts', 'screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

const mockReceipt1 = {
  success: true,
  data: {
    type: 'EXPENSE',
    confidence: 'HIGH',
    amount: 42.15,
    currency: 'USD',
    date: '2026-09-16',
    suggestedDescription: 'Walmart Supercenter',
    suggestedCategoryName: 'Alimentación',
    suggestedAccountId: 'acc-usd-1',
    accountMatchConfidence: 'HIGH',
    formattedNotes: '',
    tags: [],
  },
};

const mockReceiptMissing = {
  success: true,
  data: {
    type: 'EXPENSE',
    confidence: 'HIGH',
    amount: 51.2,
    currency: 'USD',
    date: '', // Missing date
    suggestedDescription: 'Shell Gas Station',
    suggestedCategoryName: 'Transporte',
    suggestedAccountId: '', // Missing account
    accountMatchConfidence: 'LOW',
    formattedNotes: '',
    tags: [],
  },
};

const mockReceiptIncome = {
  success: true,
  data: {
    type: 'INCOME',
    confidence: 'HIGH',
    amount: 150.0,
    currency: 'USD',
    date: '2026-09-15',
    suggestedDescription: 'Pago Freelance Cliente',
    suggestedCategoryName: 'Salario',
    suggestedAccountId: 'acc-usd-1',
    accountMatchConfidence: 'HIGH',
    formattedNotes: '',
    tags: [],
  },
};

test.describe('Mobile Batch Receipt Experience Audit & Safe Areas', () => {
  test('Audit full mobile & desktop flow with safe areas, motion, and screenshots', async ({
    page,
  }) => {
    let scanCallCount = 0;
    await page.route('**/api/ai/scan-receipt', async (route) => {
      scanCallCount++;
      if (scanCallCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockReceipt1),
        });
      } else if (scanCallCount === 2) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockReceiptMissing),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockReceiptIncome),
        });
      }
    });

    // -------------------------------------------------------------
    // 1. MOBILE 375px (iPhone SE / Standard iOS)
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Safe Area simulation: iPhone Dynamic Island / Notch
    await page.addStyleTag({
      content: `
        :root {
          --safe-area-top: 47px;
          --safe-area-bottom: 34px;
        }
      `,
    });

    // Find trigger
    const fab = page.locator('button[aria-label="Agregar transacción"]');
    const headerAddBtn = page.locator('button:has-text("Agregar")').first();
    const trigger = (await fab.isVisible()) ? fab : headerAddBtn;
    await expect(trigger).toBeVisible();

    // 1.1 Open menu with transition
    await trigger.click();
    const sheetDialog = page.getByRole('dialog', {
      name: /agregar transacción/i,
    });
    await expect(sheetDialog).toBeVisible();
    await page.waitForTimeout(300);

    // Capture 01-add-menu-375.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-add-menu-375.png'),
    });

    // Test close menu interaction
    const cancelMenuBtn = page.getByRole('button', { name: 'Cancelar' });
    await cancelMenuBtn.click();
    await page.waitForTimeout(250);
    await expect(sheetDialog).not.toBeVisible();

    // Reopen menu
    await trigger.click();
    await expect(sheetDialog).toBeVisible();
    await page.waitForTimeout(250);

    // 1.2 Tap "Agregar en lote"
    const batchBtn = page.getByText('Agregar en lote');
    await expect(batchBtn).toBeVisible();
    await batchBtn.click();
    await page.waitForTimeout(350);

    // Capture 02-batch-upload-375.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-batch-upload-375.png'),
    });

    // Verify Safe Area Clearance in Modal
    const modalTitle = page.locator('#modal-title');
    const modalCloseBtn = page.locator('button[aria-label="Cerrar modal"]');
    const titleBox = await modalTitle.boundingBox();
    const closeBox = await modalCloseBtn.boundingBox();

    console.log(
      `[Audit 375px] Title Y: ${titleBox?.y}px, Close Button Y: ${closeBox?.y}px`
    );
    // Both title and close button must sit below simulated safe-area-top (47px)
    expect(titleBox?.y).toBeGreaterThanOrEqual(47);
    expect(closeBox?.y).toBeGreaterThanOrEqual(47);

    // 1.3 Upload files
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();

    const sampleImages = [
      path.join(
        process.cwd(),
        'evals/receipt-scanner/dataset/images/sroie-paper-000.jpg'
      ),
      path.join(
        process.cwd(),
        'evals/receipt-scanner/dataset/images/sroie-paper-001.jpg'
      ),
      path.join(
        process.cwd(),
        'evals/receipt-scanner/dataset/images/degraded-whatsapp-lowres-01.jpg'
      ),
    ];

    await fileInput.setInputFiles(sampleImages);

    // Capture processing state
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-batch-processing-375.png'),
    });

    // Wait for all receipts to finish scanning
    await expect(
      page.getByText('Walmart Supercenter', { exact: true })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText('Shell Gas Station', { exact: true })
    ).toBeVisible({ timeout: 10000 });

    // Capture review state at 375px
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-batch-review-375.png'),
    });

    // Footer stays outside the scroll viewport so review content cannot render beneath it.
    const scrollContent = page.getByTestId('modal-scroll-content');
    const modalFooter = page.getByTestId('modal-footer');
    const scrollContentBox = await scrollContent.boundingBox();
    const modalFooterBox = await modalFooter.boundingBox();
    expect(scrollContentBox).not.toBeNull();
    expect(modalFooterBox).not.toBeNull();
    expect(scrollContentBox!.y + scrollContentBox!.height).toBeLessThanOrEqual(
      modalFooterBox!.y + 1
    );

    // 1.4 Test accordion expansion / collapse
    const toggleBtn = page
      .getByRole('button', { name: /(ocultar campos|editar \/ ver campos)/i })
      .first();
    await toggleBtn.scrollIntoViewIfNeeded();
    await expect(toggleBtn).toBeVisible();
    const initialText = await toggleBtn.innerText();

    // Toggle state
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // If it was expanded, it should now be collapsed (and vice versa)
    const expectedOpposite = /ocultar/i.test(initialText)
      ? /editar \/ ver campos/i
      : /ocultar campos/i;
    await expect(
      page.getByRole('button', { name: expectedOpposite }).first()
    ).toBeVisible();

    // Toggle back so the fields are visible for the screenshot
    await page.getByRole('button', { name: expectedOpposite }).first().click();
    await page.waitForTimeout(300);

    // Capture accordion expanded
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-batch-accordion-expanded-375.png'),
    });

    // -------------------------------------------------------------
    // 2. ULTRA-NARROW 320px (iPhone SE 1st gen) & 360px (Android)
    // -------------------------------------------------------------
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: 600 });
      await page.waitForTimeout(250);

      // Verify ZERO horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`[Audit ${width}px] Has horizontal overflow: ${overflow}`);
      expect(overflow).toBe(false);

      if (width === 320) {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, '06-batch-review-320.png'),
        });
      }
    }

    // -------------------------------------------------------------
    // 3. MODERN VIEWPORTS: 390px & 430px
    // -------------------------------------------------------------
    // 390px (iPhone 12/13/14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-batch-review-390.png'),
    });

    // 430px (iPhone 14/15/16 Pro Max)
    await page.setViewportSize({ width: 430, height: 932 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-batch-review-430.png'),
    });

    // -------------------------------------------------------------
    // 4. TABLET (768x1024) & DESKTOP (1440x900)
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09-batch-review-tablet.png'),
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '10-batch-review-desktop.png'),
    });
  });

  test('Emulate prefers-reduced-motion accessibility', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    const headerAddBtn = page.locator('button:has-text("Agregar")').first();
    await headerAddBtn.click();
    const sheetDialog = page.getByRole('dialog', {
      name: /agregar transacción/i,
    });
    await expect(sheetDialog).toBeVisible();

    const cancelBtn = page.getByRole('button', { name: 'Cancelar' });
    await cancelBtn.click();
    await expect(sheetDialog).not.toBeVisible();
  });
});
