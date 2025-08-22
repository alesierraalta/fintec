import { test, expect } from '@playwright/test';
import { dbUtils } from './utils/database-cleanup';

test.describe('Budgets and Goals Management', () => {
  let testAccount: any;
  let testCategories: any[];

  test.beforeEach(async () => {
    await dbUtils.waitForDatabase();
    
    testAccount = await dbUtils.createTestAccount({
      name: 'Cuenta Principal',
      type: 'BANK',
      currencyCode: 'USD',
      balance: 500000 // $5,000.00
    });

    testCategories = await dbUtils.getTestCategories();
  });

  test.afterEach(async () => {
    await dbUtils.cleanupAllTestData();
  });

  test('should create a monthly budget', async ({ page }) => {
    await page.goto('/budgets');
    
    // Click add new budget
    await page.click('text=Nuevo Presupuesto, text=Add Budget, [data-testid="add-budget"]');
    
    // Fill budget form
    await page.fill('input[name="name"], [data-testid="budget-name"]', 'Presupuesto Alimentación');
    
    // Select category (expense category)
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE' && cat.name.toLowerCase().includes('alimentación'));
    if (expenseCategory) {
      await page.selectOption('select[name="categoryId"], [data-testid="category-select"]', expenseCategory.id);
    } else {
      // Use first expense category if specific one not found
      const firstExpenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');
      if (firstExpenseCategory) {
        await page.selectOption('select[name="categoryId"], [data-testid="category-select"]', firstExpenseCategory.id);
      }
    }
    
    // Set budget amount
    await page.fill('input[name="amount"], [data-testid="budget-amount"]', '800');
    
    // Set month/year
    await page.fill('input[name="monthYear"], [data-testid="month-year"]', '2024-01');
    
    // Submit budget
    await page.click('button[type="submit"], [data-testid="save-budget"]');
    
    await page.waitForTimeout(2000);
    
    // Verify budget was created
    await expect(page.locator('text=Presupuesto Alimentación')).toBeVisible();
    await expect(page.locator('text=$800, text=800')).toBeVisible();
  });

  test('should show budget progress with transactions', async ({ page }) => {
    // First create a budget
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');
    if (!expenseCategory) return;

    await page.goto('/budgets');
    
    // Create budget
    await page.click('text=Nuevo Presupuesto, text=Add Budget, [data-testid="add-budget"]');
    await page.fill('input[name="name"], [data-testid="budget-name"]', 'Presupuesto Transporte');
    await page.selectOption('select[name="categoryId"], [data-testid="category-select"]', expenseCategory.id);
    await page.fill('input[name="amount"], [data-testid="budget-amount"]', '500');
    await page.fill('input[name="monthYear"], [data-testid="month-year"]', '2024-01');
    await page.click('button[type="submit"], [data-testid="save-budget"]');
    
    await page.waitForTimeout(2000);
    
    // Create a transaction in the same category
    await dbUtils.createTestTransaction({
      type: 'EXPENSE',
      accountId: testAccount.id,
      categoryId: expenseCategory.id,
      amountMinor: 20000, // $200
      description: 'Gasto transporte'
    });
    
    // Refresh page to see updated progress
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check if progress is shown
    await expect(page.locator('text=Presupuesto Transporte')).toBeVisible();
    await expect(page.locator('text=$200, text=200')).toBeVisible(); // spent amount
    await expect(page.locator('text=$500, text=500')).toBeVisible(); // total budget
  });

  test('should create a savings goal', async ({ page }) => {
    await page.goto('/goals');
    
    // Click add new goal
    await page.click('text=Nueva Meta, text=Add Goal, [data-testid="add-goal"]');
    
    // Fill goal form
    await page.fill('input[name="name"], [data-testid="goal-name"]', 'Vacaciones 2024');
    await page.fill('textarea[name="description"], [data-testid="goal-description"]', 'Ahorrar para vacaciones familiares');
    
    // Set target amount
    await page.fill('input[name="targetAmount"], [data-testid="target-amount"]', '3000');
    
    // Set target date
    await page.fill('input[name="targetDate"], [data-testid="target-date"]', '2024-12-31');
    
    // Link to account (optional)
    await page.selectOption('select[name="accountId"], [data-testid="account-select"]', testAccount.id);
    
    // Submit goal
    await page.click('button[type="submit"], [data-testid="save-goal"]');
    
    await page.waitForTimeout(2000);
    
    // Verify goal was created
    await expect(page.locator('text=Vacaciones 2024')).toBeVisible();
    await expect(page.locator('text=Ahorrar para vacaciones familiares')).toBeVisible();
    await expect(page.locator('text=$3,000, text=3000')).toBeVisible();
  });

  test('should update goal progress', async ({ page }) => {
    await page.goto('/goals');
    
    // Create a goal
    await page.click('text=Nueva Meta, text=Add Goal, [data-testid="add-goal"]');
    await page.fill('input[name="name"], [data-testid="goal-name"]', 'Meta Ahorro');
    await page.fill('input[name="targetAmount"], [data-testid="target-amount"]', '1000');
    await page.fill('input[name="currentAmount"], [data-testid="current-amount"]', '250');
    await page.click('button[type="submit"], [data-testid="save-goal"]');
    
    await page.waitForTimeout(2000);
    
    // Verify initial progress
    await expect(page.locator('text=Meta Ahorro')).toBeVisible();
    await expect(page.locator('text=$250, text=250')).toBeVisible(); // current amount
    await expect(page.locator('text=$1,000, text=1000')).toBeVisible(); // target amount
    
    // Edit goal to update progress
    const goalCard = page.locator('text=Meta Ahorro').locator('..');
    await goalCard.locator('button:has-text("Editar"), [data-testid="edit-goal"]').click();
    
    // Update current amount
    await page.fill('input[name="currentAmount"], [data-testid="current-amount"]', '500');
    await page.click('button[type="submit"], [data-testid="save-goal"]');
    
    await page.waitForTimeout(2000);
    
    // Verify updated progress
    await expect(page.locator('text=$500, text=500')).toBeVisible();
  });

  test('should delete a budget', async ({ page }) => {
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');
    if (!expenseCategory) return;

    await page.goto('/budgets');
    
    // Create a budget to delete
    await page.click('text=Nuevo Presupuesto, text=Add Budget, [data-testid="add-budget"]');
    await page.fill('input[name="name"], [data-testid="budget-name"]', 'Presupuesto a Eliminar');
    await page.selectOption('select[name="categoryId"], [data-testid="category-select"]', expenseCategory.id);
    await page.fill('input[name="amount"], [data-testid="budget-amount"]', '300');
    await page.fill('input[name="monthYear"], [data-testid="month-year"]', '2024-02');
    await page.click('button[type="submit"], [data-testid="save-budget"]');
    
    await page.waitForTimeout(2000);
    
    // Delete the budget
    const budgetCard = page.locator('text=Presupuesto a Eliminar').locator('..');
    await budgetCard.locator('button:has-text("Eliminar"), [data-testid="delete-budget"]').click();
    
    // Confirm deletion
    if (await page.locator('text=Confirmar, text=Eliminar').isVisible()) {
      await page.click('text=Confirmar, text=Eliminar');
    }
    
    await page.waitForTimeout(2000);
    
    // Verify budget is deleted
    await expect(page.locator('text=Presupuesto a Eliminar')).not.toBeVisible();
  });

  test('should delete a goal', async ({ page }) => {
    await page.goto('/goals');
    
    // Create a goal to delete
    await page.click('text=Nueva Meta, text=Add Goal, [data-testid="add-goal"]');
    await page.fill('input[name="name"], [data-testid="goal-name"]', 'Meta a Eliminar');
    await page.fill('input[name="targetAmount"], [data-testid="target-amount"]', '500');
    await page.click('button[type="submit"], [data-testid="save-goal"]');
    
    await page.waitForTimeout(2000);
    
    // Delete the goal
    const goalCard = page.locator('text=Meta a Eliminar').locator('..');
    await goalCard.locator('button:has-text("Eliminar"), [data-testid="delete-goal"]').click();
    
    // Confirm deletion
    if (await page.locator('text=Confirmar, text=Eliminar').isVisible()) {
      await page.click('text=Confirmar, text=Eliminar');
    }
    
    await page.waitForTimeout(2000);
    
    // Verify goal is deleted
    await expect(page.locator('text=Meta a Eliminar')).not.toBeVisible();
  });

  test('should validate budget form fields', async ({ page }) => {
    await page.goto('/budgets');
    
    // Try to create budget with missing fields
    await page.click('text=Nuevo Presupuesto, text=Add Budget, [data-testid="add-budget"]');
    
    // Submit empty form
    await page.click('button[type="submit"], [data-testid="save-budget"]');
    
    // Check for validation messages
    await expect(page.locator('text=requerido, text=required, text=obligatorio')).toBeVisible();
  });

  test('should validate goal form fields', async ({ page }) => {
    await page.goto('/goals');
    
    // Try to create goal with missing fields
    await page.click('text=Nueva Meta, text=Add Goal, [data-testid="add-goal"]');
    
    // Submit empty form
    await page.click('button[type="submit"], [data-testid="save-goal"]');
    
    // Check for validation messages
    await expect(page.locator('text=requerido, text=required, text=obligatorio')).toBeVisible();
  });

  test('should show budgets and goals on dashboard', async ({ page }) => {
    const expenseCategory = testCategories.find(cat => cat.kind === 'EXPENSE');
    if (!expenseCategory) return;

    // Create a budget
    await page.goto('/budgets');
    await page.click('text=Nuevo Presupuesto, text=Add Budget, [data-testid="add-budget"]');
    await page.fill('input[name="name"], [data-testid="budget-name"]', 'Presupuesto Dashboard');
    await page.selectOption('select[name="categoryId"], [data-testid="category-select"]', expenseCategory.id);
    await page.fill('input[name="amount"], [data-testid="budget-amount"]', '600');
    await page.fill('input[name="monthYear"], [data-testid="month-year"]', '2024-01');
    await page.click('button[type="submit"], [data-testid="save-budget"]');
    
    await page.waitForTimeout(1000);
    
    // Create a goal
    await page.goto('/goals');
    await page.click('text=Nueva Meta, text=Add Goal, [data-testid="add-goal"]');
    await page.fill('input[name="name"], [data-testid="goal-name"]', 'Meta Dashboard');
    await page.fill('input[name="targetAmount"], [data-testid="target-amount"]', '2000');
    await page.click('button[type="submit"], [data-testid="save-goal"]');
    
    await page.waitForTimeout(1000);
    
    // Check dashboard
    await page.goto('/');
    
    // Should show budget and goal summaries
    await expect(page.locator('text=Presupuesto Dashboard, text=Meta Dashboard')).toBeVisible();
  });
});



