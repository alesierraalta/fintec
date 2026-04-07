import { test, expect } from '@playwright/test';

test.describe('Email Confirmation on Login Page', () => {
  test('displays email confirmation banner after registration redirect', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    await page.evaluate(() => {
      sessionStorage.setItem('emailConfirmationPending', 'true');
      sessionStorage.setItem('pendingEmail', 'test@example.com');
    });

    await page.reload();

    await expect(page.getByText(/Verifica tu correo electrónico/i)).toBeVisible(
      { timeout: 10000 }
    );

    await expect(
      page
        .locator('p')
        .filter({ hasText: /^test@example\.com$/ })
        .first()
    ).toBeVisible();

    // Use .first() to avoid strict mode violations
    await expect(
      page
        .locator('li')
        .filter({ hasText: /Revisa tu bandeja de entrada/ })
        .first()
    ).toBeVisible();
    // "carpeta de spam" and "enlace de verificación" appear in <p> tags in the login form banner
    await expect(page.getByText(/carpeta de spam/i).first()).toBeVisible();
    await expect(
      page.getByText(/enlace de verificación/i).first()
    ).toBeVisible();
    await expect(
      page.getByText(/No podrás iniciar sesión hasta que confirmes tu email/i)
    ).toBeVisible();
  });

  test('shows resend verification button in confirmation banner', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    await page.evaluate(() => {
      sessionStorage.setItem('emailConfirmationPending', 'true');
      sessionStorage.setItem('pendingEmail', 'test@example.com');
    });

    await page.reload();

    await expect(page.getByText(/Verifica tu correo electrónico/i)).toBeVisible(
      { timeout: 10000 }
    );

    await expect(
      page.getByRole('button', { name: /Reenviar correo de verificación/i })
    ).toBeVisible();
  });

  test('shows spam folder hint in confirmation banner', async ({ page }) => {
    await page.goto('/auth/login');

    await page.evaluate(() => {
      sessionStorage.setItem('emailConfirmationPending', 'true');
      sessionStorage.setItem('pendingEmail', 'test@example.com');
    });

    await page.reload();

    await expect(page.getByText(/Verifica tu correo electrónico/i)).toBeVisible(
      { timeout: 10000 }
    );

    // Use .first() to avoid strict mode
    await expect(page.getByText(/carpeta de spam/i).first()).toBeVisible();
  });

  test('does not show confirmation banner without sessionStorage flags', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    await page.evaluate(() => {
      sessionStorage.clear();
    });

    await page.reload();

    await expect(
      page.getByText(/Verifica tu correo electrónico/i)
    ).not.toBeVisible({ timeout: 5000 });
  });
});
