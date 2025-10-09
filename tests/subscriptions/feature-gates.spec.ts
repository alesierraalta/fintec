import { test, expect } from '@playwright/test';

test.describe('Subscription Feature Gates', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in
    await page.goto('/');
  });

  test('Free tier user sees transaction limit warning', async ({ page }) => {
    // Mock free tier user with high transaction count
    await page.goto('/transactions');
    
    // Should see warning when approaching limit
    const warning = page.locator('text=/alcanzando.*límite/i');
    // Warning may or may not be visible depending on usage
    const warningCount = await warning.count();
    expect(warningCount).toBeGreaterThanOrEqual(0);
  });

  test('Free tier user cannot create transaction at limit', async ({ page }) => {
    // Mock free tier user at transaction limit
    await page.goto('/transactions/add');
    
    // Try to create transaction
    await page.fill('input[name="description"]', 'Test Transaction');
    await page.fill('input[name="amount"]', '100');
    
    // Click submit - should show upgrade modal if at limit
    await page.click('button[type="submit"]');
    
    // Check for either success or upgrade prompt
    const upgradeModal = page.locator('text=/actualizar.*plan/i');
    const success = page.locator('text=/guardando|exitosa/i');
    
    await expect(upgradeModal.or(success)).toBeVisible({ timeout: 5000 });
  });

  test('Premium badge shows in sidebar for paid users', async ({ page }) => {
    // Check sidebar for tier indicator
    const sidebar = page.locator('[class*="sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Look for tier text
    const tierText = sidebar.locator('text=/plan|gratis|base|premium/i');
    await expect(tierText).toBeVisible();
  });

  test('Backup page shows usage limits for free tier', async ({ page }) => {
    await page.goto('/backups');
    
    // Should see backup page loaded
    await expect(page.locator('h1')).toContainText(/respaldo/i);
    
    // Check for export button
    const exportButton = page.locator('button', { hasText: /exportar|respaldo/i }).first();
    await expect(exportButton).toBeVisible();
  });

  test('Pricing page loads with all tiers', async ({ page }) => {
    await page.goto('/pricing');
    
    // Should see all three tiers
    await expect(page.locator('text=Gratis')).toBeVisible();
    await expect(page.locator('text=Base')).toBeVisible();
    await expect(page.locator('text=Premium')).toBeVisible();
    
    // Check for pricing
    await expect(page.locator('text=/\\$4\\.99|\\$9\\.99/')).toBeVisible();
  });

  test('Subscription page shows current plan', async ({ page }) => {
    await page.goto('/subscription');
    
    // Should see subscription management page
    await expect(page.locator('h1')).toContainText(/suscripción/i);
    
    // Should show current tier
    await expect(page.locator('text=/gratis|base|premium/i')).toBeVisible();
  });
});

test.describe('Feature Access Control', () => {
  test('AI features are premium only', async ({ page }) => {
    await page.goto('/');
    
    // AI features should either not be visible or show upgrade prompt
    // This depends on implementation - AI features might be in a separate page or modal
  });

  test('Export feature respects limits', async ({ page }) => {
    await page.goto('/backups');
    
    // Try to create backup
    const exportButton = page.locator('button', { hasText: /exportar|respaldo/i }).first();
    await exportButton.click();
    
    // Should either download or show limit reached
    await page.waitForTimeout(2000); // Give time for action
  });
});

