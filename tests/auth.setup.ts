import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // First, let's try to register a test user
  await page.goto('/auth/register');
  
  // Fill registration form
  await page.fill('input[name="fullName"]', 'Test User');
  await page.fill('input[name="email"]', 'playwright.test@example.com');
  await page.fill('input[name="password"]', 'testpassword123');
  await page.fill('input[name="confirmPassword"]', 'testpassword123');
  
  // Click register button
  await page.click('button[type="submit"]');
  
  // Wait for successful registration - might redirect to dashboard or show success
  try {
    await page.waitForURL('/', { timeout: 10000 });
  } catch {
    // If registration fails, try to login instead
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'playwright.test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  }
  
  // Verify we're logged in by checking for user profile in header
  await expect(page.locator('[data-testid="user-menu"], text=Test User, text=playwright.test')).toBeVisible({ timeout: 5000 });
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});
