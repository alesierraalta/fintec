import { test, expect } from '@playwright/test';

test.describe('UI Styles Verification', () => {
  test('should load homepage with iOS elegant styles', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page loads without errors
    await expect(page).toHaveTitle(/FinTec/);
    
    // Verify that elements with iOS elegant styles are present
    const cardElements = page.locator('.bg-card\/60, .backdrop-blur-xl');
    await expect(cardElements.first()).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot to verify visual appearance
    await page.screenshot({ path: 'test-results/homepage-ios-styles.png', fullPage: true });
  });
  
  test('should navigate to login page and verify styles', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if login form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
    
    // Verify iOS elegant styling elements are present
    const glassElements = page.locator('.backdrop-blur-xl');
    await expect(glassElements.first()).toBeVisible();
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/login-ios-styles.png', fullPage: true });
  });
  
  test('should navigate to register page and verify styles', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if register form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
    
    // Verify form inputs are present (without trying to fill them)
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/register-ios-styles.png', fullPage: true });
  });
});