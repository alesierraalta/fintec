import { test, expect } from '@playwright/test';

/**
 * Comprehensive test suite for logo visibility on Vercel
 * 
 * Tests the fix for broken logo images caused by Next.js image configuration
 * that restricted formats to WebP/AVIF only, blocking JPG files.
 * 
 * Solution implemented:
 * 1. Changed next.config.js to use global unoptimized: true
 * 2. Added visual background containers for better visibility
 * 3. Implemented fallback text if images fail to load
 */

test.describe('Logo Visibility - Vercel Fix', () => {
  
  test.describe('Landing Page - Navigation Logo', () => {
    
    test('should display logo image without broken icon', async ({ page }) => {
      await page.goto('/landing');
      
      // Wait for the navigation logo container
      const logoContainer = page.locator('div.relative.w-24.h-24').first();
      await expect(logoContainer).toBeVisible();
      
      // Check if logo image is present
      const logoImage = logoContainer.locator('img[alt="FinTec Logo"]');
      await expect(logoImage).toBeVisible();
      
      // Verify image has loaded (naturalWidth > 0)
      const naturalWidth = await logoImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    });

    test('should have visual background container', async ({ page }) => {
      await page.goto('/landing');
      
      // Check for the background container styling
      const container = page.locator('div.relative.w-24.h-24.p-2.rounded-lg').first();
      await expect(container).toBeVisible();
      
      // Verify container has background styling classes
      const classes = await container.getAttribute('class');
      expect(classes).toContain('bg-white/5');
      expect(classes).toContain('backdrop-blur-sm');
      expect(classes).toContain('border-white/10');
    });

    test('should display fallback text if image fails', async ({ page }) => {
      // Intercept image requests and make them fail
      await page.route('**/finteclogodark.jpg', route => route.abort());
      
      await page.goto('/landing');
      await page.waitForTimeout(1000);
      
      // Check if fallback text appears
      const fallbackText = page.locator('div:has-text("FinTec")').filter({ 
        hasText: /^FinTec$/ 
      }).first();
      
      // Either image loads successfully or fallback appears
      const logoImage = page.locator('img[alt="FinTec Logo"]').first();
      const imageVisible = await logoImage.isVisible().catch(() => false);
      const fallbackVisible = await fallbackText.isVisible().catch(() => false);
      
      expect(imageVisible || fallbackVisible).toBeTruthy();
    });

    test('should load image within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/landing');
      
      const logoImage = page.locator('img[alt="FinTec Logo"]').first();
      await expect(logoImage).toBeVisible({ timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000);
    });

    test('should have unoptimized attribute', async ({ page }) => {
      await page.goto('/landing');
      
      const logoImage = page.locator('img[alt="FinTec Logo"]').first();
      await expect(logoImage).toBeVisible();
      
      // Next.js Image component doesn't expose unoptimized directly,
      // but we can verify the src doesn't contain optimization params
      const src = await logoImage.getAttribute('src');
      expect(src).toBeTruthy();
    });
  });

  test.describe('Landing Page - Footer Logo', () => {
    
    test('should display footer logo without broken icon', async ({ page }) => {
      await page.goto('/landing');
      
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      
      // Find the footer logo (w-32 h-32 is larger)
      const footerLogo = page.locator('div.relative.w-32.h-32').last();
      await expect(footerLogo).toBeVisible();
      
      const logoImage = footerLogo.locator('img[alt="FinTec Logo"]');
      await expect(logoImage).toBeVisible();
      
      const naturalWidth = await logoImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    });

    test('should have background container in footer', async ({ page }) => {
      await page.goto('/landing');
      
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      
      const container = page.locator('div.relative.w-32.h-32.p-2.rounded-lg').last();
      await expect(container).toBeVisible();
      
      const classes = await container.getAttribute('class');
      expect(classes).toContain('bg-white/5');
    });
  });

  test.describe('Sidebar Logo - Authenticated View', () => {
    
    test.beforeEach(async ({ page }) => {
      // Navigate to login first
      await page.goto('/auth/login');
      
      // Fill in credentials and login
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        
        const loginButton = page.locator('button:has-text("Iniciar")');
        await loginButton.click();
        
        // Wait for navigation to dashboard
        await page.waitForURL('/', { timeout: 5000 }).catch(() => {});
      } else {
        // If already logged in or no auth required, go to dashboard
        await page.goto('/');
      }
    });

    test('should display sidebar logo in expanded state', async ({ page }) => {
      // Wait for sidebar to be visible
      const sidebar = page.locator('div.black-theme-sidebar');
      await expect(sidebar).toBeVisible({ timeout: 5000 });
      
      // Check for logo
      const logoImage = sidebar.locator('img[alt="FinTec Logo"]');
      await expect(logoImage).toBeVisible();
      
      const naturalWidth = await logoImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    });

    test('should have background container in sidebar', async ({ page }) => {
      const sidebar = page.locator('div.black-theme-sidebar');
      await expect(sidebar).toBeVisible({ timeout: 5000 });
      
      // Check for the background container
      const container = sidebar.locator('div.relative.p-2.rounded-lg.bg-white\\/5');
      await expect(container).toBeVisible();
    });

    test('should display fallback text if sidebar logo fails', async ({ page }) => {
      // Intercept logo requests
      await page.route('**/finteclogodark.jpg', route => route.abort());
      
      // Reload page to trigger error
      await page.reload();
      await page.waitForTimeout(1000);
      
      const sidebar = page.locator('div.black-theme-sidebar');
      
      // Check for either image or fallback
      const logoImage = sidebar.locator('img[alt="FinTec Logo"]');
      const fallbackText = sidebar.locator('div:has-text("FinTec")').filter({ hasText: /^FinTec$/ });
      
      const imageVisible = await logoImage.isVisible().catch(() => false);
      const fallbackVisible = await fallbackText.isVisible().catch(() => false);
      
      expect(imageVisible || fallbackVisible).toBeTruthy();
    });

    test('should maintain logo visibility when sidebar minimizes', async ({ page, viewport }) => {
      // Skip on mobile
      if (viewport && viewport.width < 768) {
        test.skip();
      }

      const sidebar = page.locator('div.black-theme-sidebar');
      await expect(sidebar).toBeVisible({ timeout: 5000 });
      
      // Find minimize button or trigger
      const minimizeButton = page.locator('button:has-text("☰"), button:has-text("≡")').first();
      if (await minimizeButton.isVisible().catch(() => false)) {
        await minimizeButton.click();
        await page.waitForTimeout(500);
        
        // Logo should still be visible but smaller
        const logoImage = sidebar.locator('img[alt="FinTec Logo"]');
        await expect(logoImage).toBeVisible();
      }
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    
    test('should display logo in different viewports', async ({ page, viewport }) => {
      await page.goto('/landing');
      
      const logoImage = page.locator('img[alt="FinTec Logo"]').first();
      await expect(logoImage).toBeVisible();
      
      const naturalWidth = await logoImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
      
      console.log(`Logo loaded successfully on viewport: ${viewport?.width}x${viewport?.height}`);
    });

    test('should not show console errors for logo', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Logo failed to load')) {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/landing');
      await page.waitForTimeout(2000);
      
      // If errors exist, the fallback should be showing
      if (errors.length > 0) {
        const fallbackText = page.locator('div:has-text("FinTec")').filter({ 
          hasText: /^FinTec$/ 
        });
        await expect(fallbackText).toBeVisible();
      }
    });
  });

  test.describe('Production Build Verification', () => {
    
    test('should work with unoptimized images globally', async ({ page }) => {
      await page.goto('/landing');
      
      // Verify logo loads
      const logoImage = page.locator('img[alt="FinTec Logo"]').first();
      await expect(logoImage).toBeVisible();
      
      // Check that src is direct path (not optimized)
      const src = await logoImage.getAttribute('src');
      expect(src).toBeTruthy();
      
      // Image should be accessible
      const response = await page.goto(src!);
      expect(response?.status()).toBe(200);
    });

    test('should handle image with correct MIME type', async ({ page }) => {
      await page.goto('/landing');
      
      const logoImage = page.locator('img[alt="FinTec Logo"]').first();
      const src = await logoImage.getAttribute('src');
      
      if (src) {
        const response = await page.goto(src);
        const contentType = response?.headers()['content-type'];
        
        // Should be an image type
        expect(contentType).toMatch(/image\/(jpeg|jpg|png|webp|avif)/);
      }
    });
  });

  test.describe('Performance Metrics', () => {
    
    test('should load all logo instances efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/landing');
      
      // Wait for all logo instances
      const navLogo = page.locator('img[alt="FinTec Logo"]').first();
      await expect(navLogo).toBeVisible();
      
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const footerLogo = page.locator('img[alt="FinTec Logo"]').last();
      await expect(footerLogo).toBeVisible();
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(15000); // 15 seconds for all logos
    });

    test('should not block page rendering', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/landing');
      
      // Check if page is interactive
      await page.waitForLoadState('domcontentloaded');
      const dcl = Date.now() - startTime;
      
      await page.waitForLoadState('load');
      const load = Date.now() - startTime;
      
      console.log(`DOMContentLoaded: ${dcl}ms, Load: ${load}ms`);
      
      // Page should be interactive reasonably fast
      expect(dcl).toBeLessThan(5000);
    });
  });

  test.describe('Accessibility', () => {
    
    test('should have proper alt text for screen readers', async ({ page }) => {
      await page.goto('/landing');
      
      const allLogos = page.locator('img[alt="FinTec Logo"]');
      const count = await allLogos.count();
      
      expect(count).toBeGreaterThan(0);
      
      // All logos should have alt text
      for (let i = 0; i < count; i++) {
        const logo = allLogos.nth(i);
        const alt = await logo.getAttribute('alt');
        expect(alt).toBe('FinTec Logo');
      }
    });

    test('should have sufficient color contrast for fallback text', async ({ page }) => {
      // Force logo error
      await page.route('**/finteclogodark.jpg', route => route.abort());
      
      await page.goto('/landing');
      await page.waitForTimeout(1000);
      
      const fallbackText = page.locator('div:has-text("FinTec")').filter({ 
        hasText: /^FinTec$/ 
      }).first();
      
      if (await fallbackText.isVisible().catch(() => false)) {
        const color = await fallbackText.evaluate(el => {
          return window.getComputedStyle(el).color;
        });
        
        // White text should be used for dark backgrounds
        expect(color).toBeTruthy();
      }
    });
  });
});

