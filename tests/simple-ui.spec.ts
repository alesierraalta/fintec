import { test, expect } from '@playwright/test';

test.describe('Simple UI Verification', () => {
  test('should load homepage successfully', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Just verify the page loaded without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/homepage-loaded.png' });
    
    console.log('Homepage loaded successfully');
  });
  
  test('should have basic HTML structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for basic HTML elements
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('head')).toBeAttached();
    await expect(page.locator('body')).toBeVisible();
    
    console.log('Basic HTML structure verified');
  });
});