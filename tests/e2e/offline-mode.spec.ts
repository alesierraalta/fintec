import { test, expect } from '@playwright/test';

test.describe('Offline Mode Resilience', () => {
  test('should display disconnected state when network goes offline', async ({ page, context }) => {
    // 1. Go to dashboard (online)
    await page.goto('/');
    
    // Wait for rates to load initially
    await expect(page.locator('text=Tasas de Cambio')).toBeVisible();
    await expect(page.locator('text=Conectado')).toBeVisible();

    // 2. Simulate offline
    await context.setOffline(true);

    // 3. Verify UI update
    // The "Disconnected" badge should appear
    await expect(page.locator('text=Desconectado')).toBeVisible({ timeout: 10000 });
    
    // 4. Verify data persists
    // Rates should still be visible
    await expect(page.locator('text=USD/VES')).toBeVisible();
    // Check for a rate value (assuming format like "45.50")
    const rateValue = page.locator('text=USD/VES').locator('..').locator('div').nth(1);
    await expect(rateValue).not.toBeEmpty();

    // 5. Simulate online
    await context.setOffline(false);

    // 6. Verify reconnection
    await expect(page.locator('text=Conectado')).toBeVisible({ timeout: 10000 });
  });
});
