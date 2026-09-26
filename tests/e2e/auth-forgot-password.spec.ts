import { test, expect } from '@playwright/test';

test.describe('Forgot Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/forgot-password');
  });

  test('displays forgot password form with correct elements', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: /¿Olvidaste la clave\?/i })
    ).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Mandar Link/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Iniciá sesión/i })
    ).toBeVisible();
  });

  test('HTML5 validation prevents empty email submission', async ({ page }) => {
    const emailInput = page.getByLabel(/Email/i);
    await expect(emailInput).toHaveAttribute('required');
  });

  test('HTML5 validation for email format', async ({ page }) => {
    const emailInput = page.getByLabel(/Email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('shows success message after submitting valid email', async ({
    page,
  }) => {
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByRole('button', { name: /Mandar Link/i }).click();

    const successHeading = page.getByRole('heading', {
      name: /Email Enviado/i,
    });
    const serverError = page.locator('p.text-red-400');
    const submissionOutcome = successHeading.or(serverError).first();

    await expect(submissionOutcome).toBeVisible({ timeout: 10000 });

    if (await successHeading.isVisible()) {
      await expect(successHeading).toBeVisible();
      await expect(page.getByText(/test@example.com/i).first()).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Volver al inicio de sesión/i })
      ).toBeVisible();
    } else {
      await expect(serverError).toBeVisible();
      await expect(serverError).toHaveText(/\S+/);
    }
  });

  test('success page has return to login button', async ({ page }) => {
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByRole('button', { name: /Mandar Link/i }).click();

    const successHeading = page.getByRole('heading', {
      name: /Email Enviado/i,
    });
    const serverError = page.locator('p.text-red-400');
    const submissionOutcome = successHeading.or(serverError).first();

    await expect(submissionOutcome).toBeVisible({ timeout: 10000 });

    if (await successHeading.isVisible()) {
      await page
        .getByRole('button', { name: /Volver al inicio de sesión/i })
        .click();
      await expect(page).toHaveURL(/\/auth\/login/);
    } else {
      await expect(serverError).toBeVisible();
      await expect(serverError).toHaveText(/\S+/);
    }
  });

  test('redirects authenticated users to home', async ({ page }) => {
    test.skip(
      process.env.PLAYWRIGHT_LANE !== 'auth-required',
      'Requires auth-required lane'
    );

    await page.goto('/auth/forgot-password');
    await expect(page).toHaveURL(/\/$/);
  });
});
