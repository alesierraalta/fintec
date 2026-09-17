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
    date: '', // Missing date!
    suggestedDescription: 'Shell Gas Station',
    suggestedCategoryName: 'Transporte',
    suggestedAccountId: '', // Missing account!
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
    suggestedDescription: 'Pago Cliente Freelance',
    suggestedCategoryName: 'Salario',
    suggestedAccountId: 'acc-usd-1',
    accountMatchConfidence: 'HIGH',
    formattedNotes: '',
    tags: [],
  },
};

test.describe('Mobile Batch Receipt Experience Audit', () => {
  test('Audit full mobile & desktop flow with screenshots and touch target analysis', async ({
    page,
  }) => {
    let scanCallCount = 0;
    await page.route('**/api/ai/scan-receipt', async (route) => {
      scanCallCount++;
      // Return different mock data depending on call order
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

    // 1. MOBILE SMALL (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Tap Floating Action Button or Agregar button
    const fab = page.locator('button[aria-label="Agregar transacción"]');
    const headerAddBtn = page.locator('button:has-text("Agregar")').first();
    const trigger = (await fab.isVisible()) ? fab : headerAddBtn;
    await expect(trigger).toBeVisible();

    await trigger.click();
    await page.waitForTimeout(400);

    // Capture 01-add-menu-mobile.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-add-menu-mobile.png'),
    });

    // Check Drag Handle interaction
    const dragHandle = page.locator('.mx-auto.h-1\\.5.w-12.rounded-full');
    const hasDragHandle = await dragHandle.isVisible();
    console.log('[Audit] Drag handle visible:', hasDragHandle);

    // Tap "Agregar en lote"
    const batchBtn = page.getByText('Agregar en lote');
    await expect(batchBtn).toBeVisible();
    await batchBtn.click();
    await page.waitForTimeout(400);

    // Capture 02-batch-upload-mobile.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-batch-upload-mobile.png'),
    });

    // Check touch target of file upload trigger
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

    // Upload the 3 images
    await fileInput.setInputFiles(sampleImages);

    // Wait for cards to appear and finish scanning
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-batch-processing-mobile.png'),
    });

    await expect(
      page.getByText('Walmart Supercenter', { exact: true })
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText('Shell Gas Station', { exact: true })
    ).toBeVisible({
      timeout: 10000,
    });

    // Capture 04-batch-review-mobile.png
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-batch-review-mobile.png'),
    });

    // Scroll to the missing info card and capture 05-batch-missing-fields-mobile.png
    const missingCard = page
      .getByText('Shell Gas Station', { exact: true })
      .first();
    await missingCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-batch-missing-fields-mobile.png'),
    });

    // Audit touch targets in the batch review modal
    const buttons = await page.locator('button:visible').all();
    const touchTargetIssues: Array<{
      text: string;
      width: number;
      height: number;
    }> = [];

    for (const btn of buttons) {
      const box = await btn.boundingBox();
      const text =
        (await btn.innerText().catch(() => '')) ||
        (await btn.getAttribute('aria-label')) ||
        'icon-btn';
      if (box && (box.height < 40 || box.width < 40)) {
        touchTargetIssues.push({
          text: text.trim().slice(0, 30),
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }

    console.log(
      '[Audit] Small touch targets found on mobile (<40px):',
      touchTargetIssues
    );
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, '00-touch-targets-baseline.json'),
      JSON.stringify(touchTargetIssues, null, 2)
    );

    // 2. MOBILE LARGE (430x932)
    await page.setViewportSize({ width: 430, height: 932 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-batch-review-mobile-large.png'),
    });

    // 3. TABLET (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-batch-review-tablet.png'),
    });

    // 4. DESKTOP (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-batch-review-desktop.png'),
    });
  });
});
