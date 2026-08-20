import { test, expect } from '@playwright/test';

test.describe('Calculator Flow', () => {
  test('should allow user to calculate conversions via dedicated /calculator page', async ({ page }) => {
    await page.goto('/calculator');

    // Verify page header and calculator visible by default
    await expect(page.locator('h1:has-text("Calculadora VES")')).toBeVisible();
    await expect(page.locator('text=Calculadora de Conversión')).toBeVisible();

    // Verify amount input preserves trailing zero (type=text, inputMode decimal)
    const amountInput = page.getByTestId('calculator-amount-input');
    await expect(amountInput).toBeVisible();
    await expect(amountInput).toHaveAttribute('type', 'text');
    // inputMode may be lowercased
    const inputMode = await amountInput.getAttribute('inputmode');
    expect(inputMode?.toLowerCase()).toBe('decimal');

    // Fill amount with trailing zero and verify preservation
    await amountInput.fill('1.0');
    await expect(amountInput).toHaveValue('1.0');

    // Select currencies via data-testid selects
    const fromSelect = page.getByTestId('from-currency');
    const toSelect = page.getByTestId('to-currency');
    await expect(fromSelect).toBeVisible();
    await expect(toSelect).toBeVisible();
    await fromSelect.selectOption('USD');
    await toSelect.selectOption('VES');

    // Swap button should be visible and functional
    const swapButton = page.getByTestId('swap-button');
    await expect(swapButton).toBeVisible();
    // Verify swap toggles values
    await swapButton.click();
    await expect(fromSelect).toHaveValue('VES');
    await expect(toSelect).toHaveValue('USD');
    // Swap back to USD->VES for result check
    await swapButton.click();
    await expect(fromSelect).toHaveValue('USD');
    await expect(toSelect).toHaveValue('VES');

    // Result should be visible and contain target currency
    const resultDisplay = page.getByTestId('calculator-result');
    await expect(resultDisplay).toBeVisible();
    const resultText = await resultDisplay.textContent();
    expect(resultText).toContain('VES');
  });

  test('should navigate from accounts rates panel to /calculator', async ({ page }) => {
    await page.goto('/accounts');

    const historyLink = page.getByTestId('rates-history-button');
    await expect(historyLink).toBeVisible();
    // Should be a link to /calculator
    await expect(historyLink).toHaveAttribute('href', '/calculator');
    await historyLink.click();
    await expect(page).toHaveURL(/\/calculator/);
    await expect(page.locator('text=Calculadora de Conversión')).toBeVisible();
  });

  test('should preserve trailing zero on amount input without type number', async ({ page }) => {
    await page.goto('/calculator');
    const amountInput = page.getByTestId('calculator-amount-input');
    await amountInput.fill('100.00');
    await expect(amountInput).toHaveValue('100.00');
    await amountInput.fill('1.00');
    await expect(amountInput).toHaveValue('1.00');
    await amountInput.fill('0.10');
    await expect(amountInput).toHaveValue('0.10');
  });

  test('should show historical rates and allow selection', async ({ page }) => {
    await page.goto('/calculator');

    // Switch to history tab
    const historyTab = page.locator('button:has-text("Historial")');
    await historyTab.click();
    // History content should be visible (either rates or empty message)
    // Wait for loading to finish or history list
    await page.waitForTimeout(500);
    // History tab should have BCV/Binance toggles
    await expect(page.locator('button:has-text("BCV")').first()).toBeVisible();

    // Switch back to calculator tab
    const calculatorTab = page.locator('button:has-text("Calculadora")').first();
    await calculatorTab.click();
    await expect(page.locator('text=Calculadora de Conversión')).toBeVisible();
  });
});
