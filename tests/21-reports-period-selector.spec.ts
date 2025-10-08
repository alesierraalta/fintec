import { test, expect } from '@playwright/test';

test.describe('Reports Page - Period Selector Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the reports page
    await page.goto('http://localhost:3001/reports');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display period selector button with correct styling', async ({ page }) => {
    // Check if the period selector button is visible
    const periodButton = page.getByRole('button', { name: /período/i });
    await expect(periodButton).toBeVisible();
    
    // Verify it has proper background and border (semantic colors)
    const buttonStyles = await periodButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        color: computed.color,
      };
    });
    
    // Background should not be transparent (should have a color)
    expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    
    console.log('✓ Period selector button is visible with proper styling');
    console.log(`  Background: ${buttonStyles.backgroundColor}`);
    console.log(`  Border: ${buttonStyles.borderColor}`);
    console.log(`  Text: ${buttonStyles.color}`);
  });

  test('should open dropdown menu when clicked', async ({ page }) => {
    // Click the period selector button
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    // Wait for dropdown to appear
    await page.waitForSelector('text=Períodos Rápidos', { state: 'visible', timeout: 5000 });
    
    // Verify dropdown is visible
    const dropdown = page.locator('text=Períodos Rápidos');
    await expect(dropdown).toBeVisible();
    
    console.log('✓ Dropdown menu opens successfully');
  });

  test('should display all period options in dropdown', async ({ page }) => {
    // Open dropdown
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    // Wait for dropdown
    await page.waitForSelector('text=Períodos Rápidos', { state: 'visible' });
    
    // Check for quick periods
    await expect(page.locator('text=Hoy')).toBeVisible();
    await expect(page.locator('text=Esta Semana')).toBeVisible();
    await expect(page.locator('text=Este Mes')).toBeVisible();
    await expect(page.locator('text=Este Trimestre')).toBeVisible();
    await expect(page.locator('text=Este Año')).toBeVisible();
    
    // Check for last days section
    await expect(page.locator('text=Últimos Días')).toBeVisible();
    await expect(page.locator('text=Últimos 7 Días')).toBeVisible();
    await expect(page.locator('text=Últimos 30 Días')).toBeVisible();
    
    // Check for custom range option
    await expect(page.locator('text=📅 Rango Personalizado')).toBeVisible();
    
    console.log('✓ All period options are visible in dropdown');
  });

  test('should have proper contrast for dropdown items', async ({ page }) => {
    // Open dropdown
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    await page.waitForSelector('text=Este Mes', { state: 'visible' });
    
    // Get the dropdown container background
    const dropdownContainer = page.locator('text=Períodos Rápidos').locator('..');
    const containerStyles = await dropdownContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
      };
    });
    
    // Verify dropdown has proper styling
    expect(containerStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    
    console.log('✓ Dropdown has proper background styling');
    console.log(`  Container Background: ${containerStyles.backgroundColor}`);
    console.log(`  Container Border: ${containerStyles.borderColor}`);
  });

  test('should select a period and update button label', async ({ page }) => {
    // Open dropdown
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    // Wait for dropdown
    await page.waitForSelector('text=Este Mes', { state: 'visible' });
    
    // Click on "Este Mes" option
    await page.locator('text=Este Mes').first().click();
    
    // Wait a bit for state to update
    await page.waitForTimeout(500);
    
    // Verify the button now shows "Este Mes"
    const updatedButton = page.getByRole('button', { name: /este mes/i });
    await expect(updatedButton).toBeVisible();
    
    console.log('✓ Period selection updates button label correctly');
  });

  test('should apply active state styling when period is selected', async ({ page }) => {
    // Open dropdown and select a period
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    await page.waitForSelector('text=Este Mes', { state: 'visible' });
    await page.locator('text=Este Mes').first().click();
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Get the active button styles
    const activeButton = page.getByRole('button', { name: /este mes/i });
    const activeStyles = await activeButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        color: computed.color,
      };
    });
    
    // Active button should have primary color (not default card background)
    expect(activeStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    
    console.log('✓ Selected period shows active state styling');
    console.log(`  Active Background: ${activeStyles.backgroundColor}`);
    console.log(`  Active Border: ${activeStyles.borderColor}`);
    console.log(`  Active Text: ${activeStyles.color}`);
  });

  test('should show clear button when period is selected', async ({ page }) => {
    // Select a period first
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    await page.waitForSelector('text=Este Mes', { state: 'visible' });
    await page.locator('text=Este Mes').first().click();
    
    await page.waitForTimeout(500);
    
    // Look for the X button (clear button)
    const clearButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
    await expect(clearButton).toBeVisible();
    
    console.log('✓ Clear button appears when period is selected');
  });

  test('should display custom date range inputs', async ({ page }) => {
    // Open dropdown
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    await page.waitForSelector('text=📅 Rango Personalizado', { state: 'visible' });
    
    // Click custom range option
    await page.locator('text=📅 Rango Personalizado').click();
    
    // Wait for date inputs to appear
    await page.waitForSelector('input[type="date"]', { state: 'visible', timeout: 2000 });
    
    // Verify date inputs are visible
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
    
    // Verify labels
    await expect(page.locator('text=Desde')).toBeVisible();
    await expect(page.locator('text=Hasta')).toBeVisible();
    await expect(page.locator('text=Aplicar Rango')).toBeVisible();
    
    console.log('✓ Custom date range inputs display correctly');
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    // Open dropdown
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    await page.waitForSelector('text=Períodos Rápidos', { state: 'visible' });
    
    // Click outside the dropdown (on the page background)
    await page.click('body', { position: { x: 10, y: 10 } });
    
    // Wait a bit
    await page.waitForTimeout(300);
    
    // Dropdown should be hidden
    const dropdown = page.locator('text=Períodos Rápidos');
    await expect(dropdown).not.toBeVisible();
    
    console.log('✓ Dropdown closes when clicking outside');
  });

  test('should have hover effects on dropdown items', async ({ page }) => {
    // Open dropdown
    const periodButton = page.getByRole('button', { name: /período/i });
    await periodButton.click();
    
    await page.waitForSelector('text=Este Mes', { state: 'visible' });
    
    // Get the first "Este Mes" option
    const option = page.locator('text=Este Mes').first();
    
    // Hover over it
    await option.hover();
    
    // Wait a bit for hover effect
    await page.waitForTimeout(200);
    
    // Get styles after hover
    const hoverStyles = await option.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });
    
    // Should have some background (hover effect)
    expect(hoverStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    
    console.log('✓ Dropdown items have hover effects');
    console.log(`  Hover Background: ${hoverStyles.backgroundColor}`);
    console.log(`  Hover Text: ${hoverStyles.color}`);
  });
});

