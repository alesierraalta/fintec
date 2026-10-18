import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'iPhone SE (320px)', width: 320, height: 667 },
  { name: 'Android Small (360px)', width: 360, height: 740 },
  { name: 'iPhone 14 / Pixel (390px)', width: 390, height: 844 },
  { name: 'Tablet Boundary (768px)', width: 768, height: 1024 },
];

test.describe('Transaction Swipe Actions across Viewports', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        await page.goto('/dev/transaction-swipe-harness');
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('swipe-container')).toBeVisible();
      });

      test('reveals both action buttons at exact width, suppresses card click, and executes edit callback', async ({
        page,
      }) => {
        const row1 = page.getByTestId('swipe-row-1');
        const cardContent = row1.locator('[role="button"]').first();
        await expect(cardContent).toBeVisible();

        const box = await cardContent.boundingBox();
        expect(box).not.toBeNull();

        const startX = box!.x + box!.width * 0.85;
        const startY = box!.y + box!.height / 2;
        const endX = startX - 160;

        // Perform horizontal swipe gesture
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, startY, { steps: 10 });
        await page.mouse.up();

        // Verify action buttons are revealed
        const editBtn = row1.getByRole('button', { name: 'Editar' });
        const deleteBtn = row1.getByRole('button', { name: 'Eliminar' });

        await expect(editBtn).toBeVisible({ timeout: 5000 });
        await expect(deleteBtn).toBeVisible({ timeout: 5000 });

        // Verify touch targets: minimum 44px height and at least 68px width
        const editBox = await editBtn.boundingBox();
        const deleteBox = await deleteBtn.boundingBox();

        expect(editBox).not.toBeNull();
        expect(deleteBox).not.toBeNull();
        expect(editBox!.height).toBeGreaterThanOrEqual(44);
        expect(editBox!.width).toBeGreaterThanOrEqual(68);
        expect(deleteBox!.height).toBeGreaterThanOrEqual(44);
        expect(deleteBox!.width).toBeGreaterThanOrEqual(68);

        // Verify no horizontal overflow in the document layout
        const overflow = await page.evaluate(() => {
          return (
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1
          );
        });
        expect(overflow).toBe(true);

        // Click Edit action
        await editBtn.click();

        // Verify Edit callback fired and card click was suppressed
        await expect(page.getByTestId('status-log')).toHaveText(
          'Status: edit-row-1'
        );
        await expect(page.getByTestId('edit-count')).toHaveText('Edits: 1');
        await expect(page.getByTestId('click-count')).toHaveText('Clicks: 0');
      });

      test('suppresses card click on swipe and preserves pure tap click', async ({
        page,
      }) => {
        const row2 = page.getByTestId('swipe-row-2');
        const cardContent = row2.locator('[role="button"]').first();
        await expect(cardContent).toBeVisible();

        // Step 1: Pure tap triggers card onClick
        await cardContent.click();
        await expect(page.getByTestId('status-log')).toHaveText(
          'Status: click-row-2'
        );
        await expect(page.getByTestId('click-count')).toHaveText('Clicks: 1');

        // Step 2: Swipe gesture does not increment card click
        const box = await cardContent.boundingBox();
        expect(box).not.toBeNull();

        const startX = box!.x + box!.width * 0.8;
        const startY = box!.y + box!.height / 2;
        const endX = startX - 160;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, startY, { steps: 8 });
        await page.mouse.up();

        const deleteBtn = row2.getByRole('button', { name: 'Eliminar' });
        await expect(deleteBtn).toBeVisible({ timeout: 5000 });

        // Click count must still be 1
        await expect(page.getByTestId('click-count')).toHaveText('Clicks: 1');

        // Step 3: Click Delete button
        await deleteBtn.click();
        await expect(page.getByTestId('status-log')).toHaveText(
          'Status: delete-row-2'
        );
        await expect(page.getByTestId('delete-count')).toHaveText('Deletes: 1');
        await expect(page.getByTestId('click-count')).toHaveText('Clicks: 1');
      });

      test('keeps row swipe states isolated between adjacent rows', async ({
        page,
      }) => {
        const row1 = page.getByTestId('swipe-row-1');
        const row2 = page.getByTestId('swipe-row-2');

        const card1 = row1.locator('[role="button"]').first();
        const box1 = await card1.boundingBox();
        expect(box1).not.toBeNull();

        // Swipe row 1
        await page.mouse.move(
          box1!.x + box1!.width * 0.8,
          box1!.y + box1!.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
          box1!.x + box1!.width * 0.2,
          box1!.y + box1!.height / 2,
          { steps: 8 }
        );
        await page.mouse.up();

        // Row 1 buttons visible
        await expect(row1.getByRole('button', { name: 'Editar' })).toBeVisible({
          timeout: 5000,
        });

        // Row 2 buttons must NOT be visible
        await expect(
          row2.getByRole('button', { name: 'Editar' })
        ).not.toBeVisible();
        await expect(
          row2.getByRole('button', { name: 'Eliminar' })
        ).not.toBeVisible();
      });
    });
  }
});
