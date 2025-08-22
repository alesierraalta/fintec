import { test, expect } from '@playwright/test';

test('simple connectivity test', async ({ page }) => {
  console.log('Starting test...');
  
  try {
    await page.goto('http://localhost:3000/auth/login', { timeout: 10000 });
    console.log('Page loaded successfully');
    
    // Just check if the page loads
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if login form exists
    const emailInput = page.locator('input[name="email"]');
    const isVisible = await emailInput.isVisible();
    console.log('Email input visible:', isVisible);
    
    expect(isVisible).toBeTruthy();
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});



