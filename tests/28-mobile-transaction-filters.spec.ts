import { test, expect } from '@playwright/test';

/**
 * Test suite to reproduce the mobile expense filter bug
 */
test.describe('Mobile Transaction Filters', () => {
    test.use({
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    });

    test.beforeEach(async ({ page }) => {
        // Navigate to transactions page
        await page.goto('/transactions');
        await page.waitForLoadState('networkidle');

        // Ensure data is loaded
        await page.waitForSelector('text=Todas las Transacciones', { timeout: 15000 });
    });

    test('should apply expense filter correctly on mobile', async ({ page }) => {
        console.log('📱 Starting mobile expense filter test...');

        // 1. Locate the type select filter
        // Based on TransactionFilters.tsx, it's a native <select> within the "Quick Filters" div
        const typeSelect = page.locator('select').first();
        await expect(typeSelect).toBeVisible();

        // 2. Initial state: check that we have transactions of different types
        // This is a bit hard without controlled data, so we'll just check that it changes
        const initialCountText = await page.locator('h3:has-text("Todas las Transacciones")').textContent();
        console.log(`📊 Initial count: ${initialCountText}`);

        // 3. Apply "EXPENSE" filter
        console.log('🔍 Applying "Gastos" (EXPENSE) filter...');
        await typeSelect.selectOption('EXPENSE');

        // Wait for filtering to take effect (client-side memo update)
        await page.waitForTimeout(1000);

        // 4. Verify results
        const filteredCountText = await page.locator('h3:has-text("Todas las Transacciones")').textContent();
        console.log(`📊 Filtered count: ${filteredCountText}`);

        // 5. Verify that all visible transactions are indeed expenses
        // In mobile view, there is a span with getTypeLabel(transaction.type)
        const typeLabels = page.locator('.sm\\:hidden span.flex-shrink-0:has-text("Gasto"), .sm\\:hidden span.flex-shrink-0:has-text("Ingreso")');
        const count = await typeLabels.count();

        for (let i = 0; i < count; i++) {
            const label = await typeLabels.nth(i).textContent();
            expect(label).toBe('Gasto');
        }

        console.log('✅ Mobile expense filter test completed');
    });

    test('should show "Activos" badge when filter is applied', async ({ page }) => {
        const typeSelect = page.locator('select').first();
        await typeSelect.selectOption('INCOME');

        const activeBadge = page.locator('span:has-text("Activos")');
        await expect(activeBadge).toBeVisible();
    });

    test('should clear filters when "Limpiar" button is clicked', async ({ page }) => {
        const typeSelect = page.locator('select').first();
        await typeSelect.selectOption('EXPENSE');

        const clearButton = page.locator('button:has-text("Limpiar")');
        await expect(clearButton).toBeVisible();
        await clearButton.click();

        await expect(typeSelect).toHaveValue('');
    });
});
