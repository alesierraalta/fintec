import { test, expect } from '@playwright/test';

test.describe('Basic App Functionality', () => {
  
  test('should load login page successfully', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Should show login form
    await expect(page.locator('h2:has-text("Iniciar Sesión")')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
  
  test('should load register page successfully', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Should show register form
    await expect(page.locator('h2:has-text("Crear Cuenta")')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });
  
  test('should validate login form fields', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation message
    await expect(page.locator('text=Por favor completa todos los campos, text=Please fill all fields')).toBeVisible({ timeout: 5000 });
  });
  
  test('should validate register form fields', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill partial form
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show validation for missing fields
    await expect(page.locator('text=contraseña, text=password')).toBeVisible({ timeout: 5000 });
  });
  
  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill form with mismatched passwords
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password456');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.locator('text=contraseñas no coinciden, text=passwords do not match')).toBeVisible({ timeout: 5000 });
  });
  
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/auth/login');
    
    // Form should be visible and properly laid out on mobile
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check mobile-specific layout
    const formContainer = page.locator('form').first();
    await expect(formContainer).toBeVisible();
  });
  
  test('should navigate between auth pages', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Should have link to register
    await page.click('text=Regístrate aquí, text=Sign up here');
    
    // Should navigate to register page
    await expect(page).toHaveURL('/auth/register');
    await expect(page.locator('h2:has-text("Crear Cuenta")')).toBeVisible();
    
    // Should have link back to login
    await page.click('text=Inicia sesión aquí, text=Sign in here');
    
    // Should navigate back to login
    await expect(page).toHaveURL('/auth/login');
    await expect(page.locator('h2:has-text("Iniciar Sesión")')).toBeVisible();
  });
});



