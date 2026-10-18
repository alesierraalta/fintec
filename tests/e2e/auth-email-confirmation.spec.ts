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

    await expect(
      page.getByRole('heading', { name: '¡Verifica tu correo!' })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Hemos enviado un correo a:')).toBeVisible();

    // The pending email is surfaced in the banner address chip
    await expect(page.getByText('test@example.com').first()).toBeVisible();

    await expect(
      page.getByText('Revisa tu bandeja de entrada').first()
    ).toBeVisible();
    await expect(page.getByText('Verifica la carpeta de spam')).toBeVisible();
    await expect(
      page.getByText('Confirmá tu email antes de ingresar')
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

    await expect(
      page.getByRole('heading', { name: '¡Verifica tu correo!' })
    ).toBeVisible({ timeout: 10000 });

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

    await expect(
      page.getByRole('heading', { name: '¡Verifica tu correo!' })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Verifica la carpeta de spam')).toBeVisible();
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
      page.getByRole('heading', { name: '¡Verifica tu correo!' })
    ).not.toBeVisible({ timeout: 5000 });
  });
});
