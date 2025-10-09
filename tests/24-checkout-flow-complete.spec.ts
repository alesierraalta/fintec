import { test, expect } from '@playwright/test';

/**
 * Test E2E para el flujo completo de checkout
 * 
 * Este test verifica:
 * 1. Navegación desde pricing a checkout
 * 2. Visualización correcta de la información del plan
 * 3. Llamada correcta al API de LemonSqueezy
 * 4. Manejo de errores
 */

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });
  });

  test('should navigate from pricing to checkout page', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    // Find and click on "Actualizar" button for Base plan
    const baseUpgradeButton = page.locator('button:has-text("Actualizar")').first();
    await expect(baseUpgradeButton).toBeVisible();
    
    await baseUpgradeButton.click();
    
    // Should navigate to checkout page
    await expect(page).toHaveURL(/\/checkout\?tier=(base|premium)/);
  });

  test('should display correct plan information on checkout page', async ({ page }) => {
    await page.goto('/checkout?tier=base');
    await page.waitForLoadState('networkidle');

    // Check for plan name
    await expect(page.locator('text=Base')).toBeVisible();
    
    // Check for price
    await expect(page.locator('text=$4.99')).toBeVisible();
    
    // Check for "Proceder al Pago" button
    await expect(page.locator('button:has-text("Proceder al Pago")')).toBeVisible();
    
    // Check for user email
    await expect(page.locator('text=test@example.com')).toBeVisible();
  });

  test('should display premium plan information correctly', async ({ page }) => {
    await page.goto('/checkout?tier=premium');
    await page.waitForLoadState('networkidle');

    // Check for plan name
    await expect(page.locator('text=Premium')).toBeVisible();
    
    // Check for price
    await expect(page.locator('text=$9.99')).toBeVisible();
    
    // Check for AI features in the list
    await expect(page.locator('text=/Categorización automática con IA/')).toBeVisible();
  });

  test('should show error for invalid tier', async ({ page }) => {
    await page.goto('/checkout?tier=invalid');
    await page.waitForLoadState('networkidle');

    // Should show error message
    await expect(page.locator('text=Plan no válido')).toBeVisible();
    
    // Should have back button
    await expect(page.locator('button:has-text("Volver a Planes")')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-user');
    });

    await page.goto('/checkout?tier=base');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Should have returnTo parameter
    expect(page.url()).toContain('returnTo=%2Fcheckout%3Ftier%3Dbase');
  });

  test('should call API when proceeding to payment', async ({ page }) => {
    // Mock API response
    await page.route('**/api/lemonsqueezy/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://test.lemonsqueezy.com/checkout/test-session-id'
        })
      });
    });

    await page.goto('/checkout?tier=base');
    await page.waitForLoadState('networkidle');

    // Click proceed to payment button
    const proceedButton = page.locator('button:has-text("Proceder al Pago")');
    await expect(proceedButton).toBeVisible();
    await proceedButton.click();

    // Wait for API call
    await page.waitForRequest('**/api/lemonsqueezy/checkout');
    
    // Should show loading state
    await expect(page.locator('text=Procesando...')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/lemonsqueezy/checkout', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to create checkout session'
        })
      });
    });

    await page.goto('/checkout?tier=base');
    await page.waitForLoadState('networkidle');

    // Click proceed to payment button
    const proceedButton = page.locator('button:has-text("Proceder al Pago")');
    await proceedButton.click();

    // Should show error message
    await expect(page.locator('text=/Error/')).toBeVisible();
    await expect(page.locator('text=/Failed to create checkout session/')).toBeVisible();
    
    // Button should be re-enabled
    await expect(proceedButton).toBeEnabled();
  });

  test('should have back button that returns to pricing', async ({ page }) => {
    await page.goto('/checkout?tier=base');
    await page.waitForLoadState('networkidle');

    const backButton = page.locator('button:has-text("Volver a Planes")').first();
    await expect(backButton).toBeVisible();
    
    await backButton.click();
    
    await expect(page).toHaveURL('/pricing');
  });

  test('should show all plan features in the checkout page', async ({ page }) => {
    await page.goto('/checkout?tier=base');
    await page.waitForLoadState('networkidle');

    // Check for some key features
    await expect(page.locator('text=/Transacciones ilimitadas/')).toBeVisible();
    await expect(page.locator('text=/Historial completo/')).toBeVisible();
    await expect(page.locator('text=/Respaldos automáticos/')).toBeVisible();
  });

  test('should display security badges', async ({ page }) => {
    await page.goto('/checkout?tier=base');
    await page.waitForLoadState('networkidle');

    // Check for security information
    await expect(page.locator('text=/Pago seguro/')).toBeVisible();
    await expect(page.locator('text=/SSL Encriptado/')).toBeVisible();
    await expect(page.locator('text=/PCI Compliant/')).toBeVisible();
    await expect(page.locator('text=/Lemon Squeezy/')).toBeVisible();
  });
});

test.describe('Checkout API Integration', () => {
  test('should send correct data to API', async ({ page }) => {
    let apiRequestBody: any = null;

    // Intercept API call
    await page.route('**/api/lemonsqueezy/checkout', async (route) => {
      apiRequestBody = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://test.lemonsqueezy.com/checkout/test'
        })
      });
    });

    // Set up authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });

    await page.goto('/checkout?tier=premium');
    await page.waitForLoadState('networkidle');

    // Click proceed button
    await page.locator('button:has-text("Proceder al Pago")').click();
    
    // Wait for API call
    await page.waitForTimeout(500);

    // Verify API request body
    expect(apiRequestBody).toBeTruthy();
    expect(apiRequestBody.userId).toBe('test-user-123');
    expect(apiRequestBody.tier).toBe('premium');
  });
});
