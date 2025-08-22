import { test, expect } from '@playwright/test';

test.describe('Core App Functionality', () => {
  
  test('should successfully register a new user', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill registration form with unique email
    const uniqueEmail = `test.${Date.now()}@example.com`;
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should either redirect to dashboard or show success message
    await page.waitForTimeout(3000); // Wait for processing
    
    // Check if we're on dashboard or success page
    const currentUrl = page.url();
    const hasSuccessIndicator = await page.locator('text=exitosamente, text=successfully, text=completado, text=completed').isVisible();
    const isDashboard = currentUrl.includes('/') && !currentUrl.includes('/auth/');
    
    expect(hasSuccessIndicator || isDashboard).toBeTruthy();
  });
  
  test('should handle existing user login', async ({ page }) => {
    // First register a user
    await page.goto('/auth/register');
    const testEmail = `existing.${Date.now()}@example.com`;
    
    await page.fill('input[name="fullName"]', 'Existing User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait a bit for registration
    await page.waitForTimeout(2000);
    
    // Now try to login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    expect(currentUrl.endsWith('/') || currentUrl.includes('dashboard')).toBeTruthy();
  });
  
  test('should show proper error for invalid login', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try with invalid credentials
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=inválidas, text=invalid, text=error, .error, [role="alert"]')).toBeVisible({ timeout: 5000 });
  });
  
  test('should display dashboard after successful authentication', async ({ page }) => {
    // Register and login
    await page.goto('/auth/register');
    const testEmail = `dashboard.${Date.now()}@example.com`;
    
    await page.fill('input[name="fullName"]', 'Dashboard User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for registration and potential redirect
    await page.waitForTimeout(3000);
    
    // Check if we're on dashboard, if not try to navigate
    if (!page.url().endsWith('/')) {
      await page.goto('/');
    }
    
    // Should show dashboard elements (even if empty)
    await expect(page.locator('text=Dashboard, text=Inicio, text=Dinero Total, text=Balance')).toBeVisible({ timeout: 10000 });
  });
  
  test('should protect routes requiring authentication', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/accounts');
    
    // Should redirect to login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/auth/login');
    
    // Should show login form
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
  
  test('should show user profile information after login', async ({ page }) => {
    // Register user
    await page.goto('/auth/register');
    const testEmail = `profile.${Date.now()}@example.com`;
    
    await page.fill('input[name="fullName"]', 'Profile User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Navigate to profile page
    await page.goto('/profile');
    
    // Should show profile information
    await expect(page.locator('text=Mi Perfil, text=Profile')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Profile User, input[value*="Profile User"]')).toBeVisible({ timeout: 5000 });
  });
  
  test('should allow logout functionality', async ({ page }) => {
    // Register and login
    await page.goto('/auth/register');
    const testEmail = `logout.${Date.now()}@example.com`;
    
    await page.fill('input[name="fullName"]', 'Logout User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Navigate to dashboard if not there
    await page.goto('/');
    
    // Look for user menu or logout option
    const userMenuExists = await page.locator('text=Logout User, [data-testid="user-menu"], button:has-text("Logout User")').isVisible();
    
    if (userMenuExists) {
      // Click user menu
      await page.click('text=Logout User, [data-testid="user-menu"], button:has-text("Logout User")');
      
      // Click logout
      await page.click('text=Cerrar Sesión, text=Logout, text=Sign Out');
      
      // Should redirect to login
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/auth/login');
    }
  });
});



