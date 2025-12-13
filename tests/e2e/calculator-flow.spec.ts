import { test, expect } from '@playwright/test';

test.describe('Calculator Flow', () => {
  test('should allow user to calculate conversions', async ({ page }) => {
    // 1. Navigate to accounts page
    await page.goto('/accounts');

    // 2. Open History/Calculator modal
    // Wait for the button to be visible and click it
    const historyButton = page.locator('button:has-text("Ver Historial y Calculadora")');
    await expect(historyButton).toBeVisible();
    await historyButton.click();

    // 3. Verify modal opens
    await expect(page.locator('text=Historial de Tasas')).toBeVisible();

    // 4. Switch to Calculator tab
    const calculatorTab = page.locator('button:has-text("Calculadora")');
    await calculatorTab.click();

    // 5. Verify calculator elements are present
    await expect(page.locator('text=Calculadora de Conversión')).toBeVisible();
    
    // 6. Perform a calculation
    // Enter amount "100"
    const amountInput = page.getByPlaceholder('Ingresa la cantidad');
    await amountInput.fill('100');

    // Select source currency (e.g., USD) - Default might already be USD
    // Using select options if they are standard selects, or locator clicks if custom dropdowns
    // Based on code reading, they are standard <select> elements
    // <select value={calculator.fromCurrency} ...>
    
    // Select From: USD
    const fromSelect = page.locator('label:has-text("De")').locator('..').locator('select');
    await fromSelect.selectOption('USD');

    // Select To: VES
    const toSelect = page.locator('label:has-text("A")').locator('..').locator('select');
    await toSelect.selectOption('VES');

    // 7. Check result
    // Result is displayed in a div
    // We expect *some* result. Since rates change, we just check it's not 0 or empty if rate exists.
    // However, if we don't have historical data loaded in the modal (because it fetches history), 
    // we might need to select a rate from history first?
    
    // Looking at rates-history.tsx:
    // useEffect -> loadHistoricalRates -> sets selectedBCVRate/selectedBinanceRate -> calculates result.
    // If no history data, result might be 0?
    // "Selecciona una fecha del historial" is shown if no rate selected?
    // Code says: "Seleccionar la tasa más reciente por defecto para la calculadora" in loadHistoricalRates.
    
    // So it should auto-select.
    // Wait for result to appear.
    const resultDisplay = page.locator('text=Resultado').locator('..').locator('p.text-2xl');
    await expect(resultDisplay).toBeVisible();
    
    // Get text content
    const resultText = await resultDisplay.textContent();
    // It should contain "VES"
    expect(resultText).toContain('VES');
    // And value should be > 0 (assuming rate > 0)
    // We can't strictly check the value without mocking the API response for /api/bcv-rates or history service.
    // For E2E on real/dev env, checking for visibility and format is good enough.
  });
});
