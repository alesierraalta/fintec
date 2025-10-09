import { test, expect } from '@playwright/test';

test.describe('Data Retention for Free Tier', () => {
  test('Free tier shows 6-month history limit', async ({ page }) => {
    await page.goto('/pricing');
    
    // Look for history limit in free tier
    const freeTier = page.locator('text=Gratis').locator('..').locator('..');
    await expect(freeTier.locator('text=/6 meses|historial.*6/i')).toBeVisible();
  });

  test('Paid tiers show unlimited history', async ({ page }) => {
    await page.goto('/pricing');
    
    // Base tier should have unlimited history
    const baseTier = page.locator('text=Base').locator('..').locator('..');
    await expect(baseTier.locator('text=/ilimitad|completo/i')).toBeVisible();
    
    // Premium tier should also have unlimited
    const premiumTier = page.locator('text=Premium').locator('..').locator('..');
    await expect(premiumTier.locator('text=/ilimitad/i')).toBeVisible();
  });

  test('Data retention policy is mentioned in FAQ', async ({ page }) => {
    await page.goto('/pricing');
    
    // Scroll to FAQ section
    await page.locator('text=/preguntas.*frecuentes|faq/i').scrollIntoViewIfNeeded();
    
    // Should mention data retention
    await expect(page.locator('text=/datos.*seguro|historial|6 meses/i')).toBeVisible();
  });
});

test.describe('Data Export', () => {
  test('Free users can export data before deletion', async ({ page }) => {
    await page.goto('/backups');
    
    // Should have export functionality
    await expect(page.locator('button', { hasText: /exportar|respaldo/i })).toBeVisible();
  });

  test('Export includes all transaction data', async ({ page }) => {
    await page.goto('/backups');
    
    // Check that backup description mentions what's included
    await expect(page.locator('text=/cuentas.*transacciones|datos incluidos/i')).toBeVisible();
  });
});

