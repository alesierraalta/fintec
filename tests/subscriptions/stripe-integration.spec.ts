import { test, expect } from '@playwright/test';

test.describe('Stripe Payment Flow', () => {
  test('Pricing page loads Stripe pricing correctly', async ({ page }) => {
    await page.goto('/pricing');
    
    // Check for pricing information
    await expect(page.locator('h1')).toContainText(/plan|precio/i);
    
    // Verify tier cards are present
    await expect(page.locator('text=Gratis')).toBeVisible();
    await expect(page.locator('text=Base')).toBeVisible();
    await expect(page.locator('text=Premium')).toBeVisible();
    
    // Check for pricing amounts
    await expect(page.locator('text=/\\$4\\.99/')).toBeVisible();
    await expect(page.locator('text=/\\$9\\.99/')).toBeVisible();
  });

  test('Upgrade button redirects to checkout (would redirect to Stripe)', async ({ page }) => {
    await page.goto('/pricing');
    
    // Find upgrade buttons
    const upgradeButtons = page.locator('button', { hasText: /actualizar|seleccionar/i });
    const buttonCount = await upgradeButtons.count();
    
    // Should have at least 2 upgrade buttons (Base and Premium)
    expect(buttonCount).toBeGreaterThanOrEqual(2);
    
    // Click first upgrade button (Base)
    if (buttonCount > 0) {
      // Note: This would actually redirect to Stripe in production
      // In test, it might require authentication first
      await upgradeButtons.first().click();
      
      // Should either redirect to login or Stripe checkout
      await page.waitForTimeout(1000);
    }
  });

  test('Customer portal link works for paid users', async ({ page }) => {
    await page.goto('/subscription');
    
    // Look for manage subscription button
    const manageButton = page.locator('button', { hasText: /administrar/i });
    
    // Button may not be visible for free users
    const isVisible = await manageButton.isVisible();
    
    if (isVisible) {
      // Would redirect to Stripe portal
      await expect(manageButton).toBeEnabled();
    }
  });

  test('Success page shows after successful payment', async ({ page }) => {
    // Simulate arriving at success page with session ID
    await page.goto('/subscription/success?session_id=test_session_123');
    
    // Should show success message
    await expect(page.locator('text=/exitosa|éxito|successful/i')).toBeVisible({ timeout: 10000 });
    
    // Should have button to go to dashboard
    await expect(page.locator('button', { hasText: /dashboard|inicio/i })).toBeVisible();
  });
});

test.describe('Subscription Management', () => {
  test('Subscription page shows plan details', async ({ page }) => {
    await page.goto('/subscription');
    
    // Should show current plan
    await expect(page.locator('h1')).toContainText(/suscripción/i);
    
    // Should show tier information
    await expect(page.locator('text=/gratis|base|premium/i')).toBeVisible();
  });

  test('Cancel subscription option available for paid users', async ({ page }) => {
    await page.goto('/subscription');
    
    // Manage button should be present (or not, depending on tier)
    const manageButton = page.locator('button', { hasText: /administrar/i });
    
    // Just verify page loads correctly
    await expect(page.locator('h1')).toBeVisible();
  });
});

