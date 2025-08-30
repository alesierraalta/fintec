import { test, expect } from '@playwright/test';

test('simple connectivity test', async ({ page }) => {
  
  try {
    await page.goto('http://localhost:3000/auth/login', { timeout: 10000 });
    
    // Just check if the page loads
    const title = await page.title();
    
    // Check if login form exists
    const emailInput = page.locator('input[name="email"]');
    const isVisible = await emailInput.isVisible();
    
    expect(isVisible).toBeTruthy();
    
  } catch (error) {
    throw error;
  }
});



