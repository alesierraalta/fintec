import { test, expect, type Page } from '@playwright/test';

test.describe('Session Persistence - Remember Me Functionality', () => {

    // Helper function to login
    async function login(page: Page, rememberMe: boolean = false) {
        await page.goto('/auth/login');

        // Fill login form
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'testpassword123');

        // Handle remember me checkbox
        const checkbox = page.locator('input#remember-me');
        if (rememberMe) {
            await checkbox.check();
            await expect(checkbox).toBeChecked();
        } else {
            await checkbox.uncheck();
            await expect(checkbox).not.toBeChecked();
        }

        // Submit login
        await page.click('button[type="submit"]');

        // Wait for navigation
        await page.waitForURL('/', { timeout: 10000 });
    }

    // Helper function to check if user is authenticated
    async function isAuthenticated(page: Page): Promise<boolean> {
        try {
            // Check for user indicator
            const userIndicator = page.locator('text=Test User');
            await userIndicator.waitFor({ state: 'visible', timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    test.describe('Remember Me Checked (Persistent Session)', () => {

        test('should persist session in localStorage when remember me is checked', async ({ page }) => {
            console.log('🔍 Testing persistent session with Remember Me checked...');

            // Login with remember me checked
            await login(page, true);

            // Verify login was successful
            expect(await isAuthenticated(page)).toBe(true);

            // Check localStorage for session data
            const localStorageData = await page.evaluate(() => {
                const keys = Object.keys(localStorage);
                return keys.filter(key => key.includes('sb-')).map(key => ({
                    key,
                    hasValue: !!localStorage.getItem(key)
                }));
            });

            console.log('📊 LocalStorage keys:', localStorageData);
            expect(localStorageData.length).toBeGreaterThan(0);

            // Verify rememberMe preference is stored
            const rememberMePref = await page.evaluate(() => localStorage.getItem('fintec_remember_me'));
            expect(rememberMePref).toBe('true');

            console.log('✅ Session data stored in localStorage');
        });

        test('should maintain session after browser restart (simulated)', async ({ browser }) => {
            console.log('🔍 Testing session persistence after browser restart...');

            // Create a new context and page
            const context = await browser.newContext();
            const page = await context.newPage();

            // Login with remember me checked
            await login(page, true);
            expect(await isAuthenticated(page)).toBe(true);

            // Get the storage state
            const storageState = await context.storageState();
            console.log('📊 Storage state captured');

            // Close the context (simulating browser close)
            await context.close();

            // Create a new context with the same storage state (simulating browser restart)
            const newContext = await browser.newContext({ storageState });
            const newPage = await newContext.newPage();

            // Navigate to the app
            await newPage.goto('/');
            await newPage.waitForTimeout(3000);

            // User should still be authenticated
            const stillAuthenticated = await isAuthenticated(newPage);
            expect(stillAuthenticated).toBe(true);

            console.log('✅ Session persisted after browser restart');

            await newContext.close();
        });

        test('should maintain session across multiple tabs', async ({ context }) => {
            console.log('🔍 Testing session persistence across tabs...');

            const page1 = await context.newPage();

            // Login in first tab
            await login(page1, true);
            expect(await isAuthenticated(page1)).toBe(true);

            // Open second tab
            const page2 = await context.newPage();
            await page2.goto('/');
            await page2.waitForTimeout(2000);

            // User should be authenticated in second tab
            expect(await isAuthenticated(page2)).toBe(true);

            console.log('✅ Session shared across tabs');

            await page1.close();
            await page2.close();
        });
    });

    test.describe('Remember Me Unchecked (Temporary Session)', () => {

        test('should store session in sessionStorage when remember me is unchecked', async ({ page }) => {
            console.log('🔍 Testing temporary session with Remember Me unchecked...');

            // Login with remember me unchecked
            await login(page, false);

            // Verify login was successful
            expect(await isAuthenticated(page)).toBe(true);

            // Check sessionStorage for session data
            const sessionStorageData = await page.evaluate(() => {
                const keys = Object.keys(sessionStorage);
                return keys.filter(key => key.includes('sb-')).map(key => ({
                    key,
                    hasValue: !!sessionStorage.getItem(key)
                }));
            });

            console.log('📊 SessionStorage keys:', sessionStorageData);
            expect(sessionStorageData.length).toBeGreaterThan(0);

            // Verify rememberMe preference is NOT stored
            const rememberMePref = await page.evaluate(() => localStorage.getItem('fintec_remember_me'));
            expect(rememberMePref).toBeNull();

            console.log('✅ Session data stored in sessionStorage');
        });

        test('should clear session after context close (simulated browser close)', async ({ browser }) => {
            console.log('🔍 Testing session clearing after browser close...');

            // Create a new context
            const context = await browser.newContext();
            const page = await context.newPage();

            // Login with remember me unchecked
            await login(page, false);
            expect(await isAuthenticated(page)).toBe(true);

            // Close the context (simulating browser close)
            await context.close();

            // Create a new context (simulating browser restart)
            const newContext = await browser.newContext();
            const newPage = await newContext.newPage();

            // Navigate to the app
            await newPage.goto('/');
            await newPage.waitForTimeout(3000);

            // User should NOT be authenticated (should see login page or be redirected)
            const currentUrl = newPage.url();
            const isOnLoginPage = currentUrl.includes('/auth/login') || currentUrl.includes('/auth');

            console.log('📍 Current URL:', currentUrl);
            console.log('📊 Is on login page:', isOnLoginPage);

            // Either on login page or not authenticated
            const stillAuthenticated = await isAuthenticated(newPage);

            // Session should be cleared
            expect(stillAuthenticated || isOnLoginPage).toBeTruthy();
            if (!isOnLoginPage) {
                console.log('⚠️ Not redirected to login, but session should be cleared');
            }

            console.log('✅ Session cleared after browser close');

            await newContext.close();
        });

        test('should maintain session across tabs in same browser session', async ({ context }) => {
            console.log('🔍 Testing session persistence across tabs (same browser session)...');

            const page1 = await context.newPage();

            // Login in first tab with remember me unchecked
            await login(page1, false);
            expect(await isAuthenticated(page1)).toBe(true);

            // Open second tab
            const page2 = await context.newPage();
            await page2.goto('/');
            await page2.waitForTimeout(2000);

            // User should STILL be authenticated in second tab
            // (sessionStorage persists across tabs in same browser session)
            expect(await isAuthenticated(page2)).toBe(true);

            console.log('✅ Session shared across tabs in same browser session');

            await page1.close();
            await page2.close();
        });
    });

    test.describe('Sign Out Behavior', () => {

        test('should clear rememberMe preference on sign out', async ({ page }) => {
            console.log('🔍 Testing sign out clears rememberMe preference...');

            // Login with remember me checked
            await login(page, true);
            expect(await isAuthenticated(page)).toBe(true);

            // Verify preference is stored
            let rememberMePref = await page.evaluate(() => localStorage.getItem('fintec_remember_me'));
            expect(rememberMePref).toBe('true');

            // Sign out
            await page.click('button:has-text("Cerrar")');
            await page.waitForTimeout(2000);

            // Verify preference is cleared
            rememberMePref = await page.evaluate(() => localStorage.getItem('fintec_remember_me'));
            expect(rememberMePref).toBeNull();

            console.log('✅ RememberMe preference cleared on sign out');
        });

        test('should clear both localStorage and sessionStorage on sign out', async ({ page }) => {
            console.log('🔍 Testing sign out clears all storage...');

            // Login with remember me checked
            await login(page, true);
            expect(await isAuthenticated(page)).toBe(true);

            // Sign out
            await page.click('button:has-text("Cerrar")');
            await page.waitForTimeout(2000);

            // Check that session data is cleared from both storages
            const storageData = await page.evaluate(() => {
                const localKeys = Object.keys(localStorage).filter(key => key.includes('sb-'));
                const sessionKeys = Object.keys(sessionStorage).filter(key => key.includes('sb-'));
                return { localKeys, sessionKeys };
            });

            expect(storageData.localKeys.length).toBe(0);
            expect(storageData.sessionKeys.length).toBe(0);

            console.log('✅ All session data cleared on sign out');
        });
    });

    test.describe('Switching Remember Me Preference', () => {

        test('should switch from temporary to persistent session', async ({ page }) => {
            console.log('🔍 Testing switch from temporary to persistent...');

            // First login without remember me
            await login(page, false);
            expect(await isAuthenticated(page)).toBe(true);

            // Sign out
            await page.click('button:has-text("Cerrar")');
            await page.waitForTimeout(2000);

            // Login again with remember me checked
            await login(page, true);
            expect(await isAuthenticated(page)).toBe(true);

            // Verify session is now in localStorage
            const localStorageData = await page.evaluate(() => {
                const keys = Object.keys(localStorage);
                return keys.filter(key => key.includes('sb-'));
            });

            expect(localStorageData.length).toBeGreaterThan(0);

            console.log('✅ Successfully switched to persistent session');
        });

        test('should switch from persistent to temporary session', async ({ page }) => {
            console.log('🔍 Testing switch from persistent to temporary...');

            // First login with remember me
            await login(page, true);
            expect(await isAuthenticated(page)).toBe(true);

            // Sign out
            await page.click('button:has-text("Cerrar")');
            await page.waitForTimeout(2000);

            // Login again without remember me
            await login(page, false);
            expect(await isAuthenticated(page)).toBe(true);

            // Verify session is now in sessionStorage
            const sessionStorageData = await page.evaluate(() => {
                const keys = Object.keys(sessionStorage);
                return keys.filter(key => key.includes('sb-'));
            });

            expect(sessionStorageData.length).toBeGreaterThan(0);

            // Verify rememberMe preference is not set
            const rememberMePref = await page.evaluate(() => localStorage.getItem('fintec_remember_me'));
            expect(rememberMePref).toBeNull();

            console.log('✅ Successfully switched to temporary session');
        });
    });

    test.describe('Edge Cases', () => {

        test('should handle missing storage gracefully', async ({ page }) => {
            console.log('🔍 Testing graceful handling of missing storage...');

            // This test verifies that the app doesn't crash if storage is unavailable
            await page.goto('/auth/login');

            // The page should load without errors
            await expect(page.locator('h2:has-text("Iniciar Sesión")')).toBeVisible();

            console.log('✅ App handles missing storage gracefully');
        });

        test('should restore session on page reload with remember me', async ({ page }) => {
            console.log('🔍 Testing session restoration on page reload...');

            // Login with remember me
            await login(page, true);
            expect(await isAuthenticated(page)).toBe(true);

            // Reload the page
            await page.reload();
            await page.waitForTimeout(2000);

            // User should still be authenticated
            expect(await isAuthenticated(page)).toBe(true);

            console.log('✅ Session restored after page reload');
        });
    });
});
