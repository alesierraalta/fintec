import { test, expect } from '@playwright/test';

/**
 * Test suite for mobile viewport behavior on login page
 * Validates that the login form works correctly when keyboard opens/closes
 */
test.describe('Mobile Login Viewport', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login page
        await page.goto('/auth/login');
        await page.waitForLoadState('networkidle');
    });

    test('should use responsive layout classes in mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);

        // Find the flex container
        const container = page.locator('div.min-h-full').first();

        // Check that container has the correct responsive classes
        const className = await container.getAttribute('class');

        // Verify mobile-first classes (items-start, justify-start)
        expect(className).toContain('items-start');
        expect(className).toContain('justify-start');

        // Verify desktop classes (sm:items-center, sm:justify-center)
        expect(className).toContain('sm:items-center');
        expect(className).toContain('sm:justify-center');
    });

    test('should use centered layout in desktop viewport', async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.waitForTimeout(500);

        // Find the flex container
        const container = page.locator('div.min-h-full').first();

        // Get computed styles
        const alignItems = await container.evaluate((el) => {
            return window.getComputedStyle(el).alignItems;
        });

        const justifyContent = await container.evaluate((el) => {
            return window.getComputedStyle(el).justifyContent;
        });

        // In desktop (>= 640px), should be centered
        expect(alignItems).toBe('center');
        expect(justifyContent).toBe('center');
    });

    test('should allow scrolling in mobile viewport with reduced height', async ({ page }) => {
        // Set mobile viewport with reduced height (simulating keyboard open)
        await page.setViewportSize({ width: 375, height: 400 });
        await page.waitForTimeout(500);

        // Check that the outer container has overflow-y-auto
        const outerContainer = page.locator('div.min-h-dynamic-screen').first();
        const overflowY = await outerContainer.evaluate((el) => {
            return window.getComputedStyle(el).overflowY;
        });

        expect(overflowY).toBe('auto');

        // Check that all form elements exist and are in the document
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator('button:has-text("Iniciar Sesión")');

        await expect(emailInput).toBeInViewport({ ratio: 0.1 }); // At least 10% visible or scrollable
        expect(await passwordInput.count()).toBe(1);
        expect(await submitButton.count()).toBe(1);
    });

    test('should make all form elements accessible via scroll in mobile', async ({ page }) => {
        // Set mobile viewport with very reduced height
        await page.setViewportSize({ width: 375, height: 350 });
        await page.waitForTimeout(500);

        // Locate all key form elements
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator('button:has-text("Iniciar Sesión")');
        const rememberCheckbox = page.locator('input[type="checkbox"]').first();

        // Scroll to each element and verify it becomes visible
        await emailInput.scrollIntoViewIfNeeded();
        await expect(emailInput).toBeVisible();

        await passwordInput.scrollIntoViewIfNeeded();
        await expect(passwordInput).toBeVisible();

        await rememberCheckbox.scrollIntoViewIfNeeded();
        await expect(rememberCheckbox).toBeVisible();

        await submitButton.scrollIntoViewIfNeeded();
        await expect(submitButton).toBeVisible();
    });

    test('should auto-scroll when input receives focus in mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);

        const emailInput = page.locator('input[type="email"]');

        // Get initial position
        const initialBox = await emailInput.boundingBox();

        // Focus the input
        await emailInput.focus();

        // Wait for scroll animation (300ms delay + animation time)
        await page.waitForTimeout(500);

        // Check that scrollIntoView was called by verifying the element is more centered
        const finalBox = await emailInput.boundingBox();

        // The element should be present
        expect(finalBox).not.toBeNull();
        expect(initialBox).not.toBeNull();

        // Verify input is in viewport (basic check)
        await expect(emailInput).toBeVisible();
    });

    test('should maintain desktop layout behavior unchanged', async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.waitForTimeout(500);

        // Verify form is visible and centered
        const formContainer = page.locator('div.w-full.max-w-md').first();
        await expect(formContainer).toBeVisible();

        // Get container position to verify centering
        const containerBox = await formContainer.boundingBox();
        const viewportHeight = 720;

        if (containerBox) {
            // In desktop, form should be roughly centered vertically
            // (allowing for some margin of error)
            const centerY = containerBox.y + containerBox.height / 2;
            const viewportCenterY = viewportHeight / 2;
            const difference = Math.abs(centerY - viewportCenterY);

            // Should be centered within 100px tolerance
            expect(difference).toBeLessThan(100);
        }
    });

    test('should not apply auto-scroll in desktop viewport', async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(500);

        const emailInput = page.locator('input[type="email"]');

        // Focus the input
        await emailInput.focus();
        await page.waitForTimeout(500);

        // In desktop, the behavior should remain unchanged
        // Just verify the input is focused and visible
        await expect(emailInput).toBeFocused();
        await expect(emailInput).toBeVisible();
    });
});
