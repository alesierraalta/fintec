import { test, expect } from '@playwright/test';

test.describe('Reset Password Flow', () => {
  test('displays loading state when accessed without tokens', async ({
    page,
  }) => {
    // Without tokens, the page should show loading and redirect to forgot-password
    await page.goto('/auth/reset-password');

    // Should redirect to forgot-password since no tokens in URL
    await expect(page).toHaveURL(/\/auth\/forgot-password/, { timeout: 10000 });
  });

  test('displays reset password form when accessed with mock tokens', async ({
    page,
  }) => {
    // Navigate with mock tokens in the URL hash
    await page.goto(
      '/auth/reset-password#access_token=fake-token&refresh_token=fake-refresh'
    );

    // Should show the reset password form
    await expect(
      page.getByRole('heading', { name: /Restablecer Contraseña/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/Nueva Contraseña/i)).toBeVisible();
    await expect(page.getByLabel(/Confirmar Contraseña/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Actualizar Contraseña/i })
    ).toBeVisible();
  });

  test('shows password hint text', async ({ page }) => {
    await page.goto(
      '/auth/reset-password#access_token=fake-token&refresh_token=fake-refresh'
    );

    await expect(
      page.getByText(
        /Mínimo 8 caracteres, incluyendo mayúsculas, minúsculas y números/i
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto(
      '/auth/reset-password#access_token=fake-token&refresh_token=fake-refresh'
    );

    await page.getByLabel(/Nueva Contraseña/i).fill('Test1234!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('Different1234!');
    await page.getByRole('button', { name: /Actualizar Contraseña/i }).click();

    await expect(page.getByText(/Las contraseñas no coinciden/i)).toBeVisible();
  });

  test('shows error when password is too short', async ({ page }) => {
    await page.goto(
      '/auth/reset-password#access_token=fake-token&refresh_token=fake-refresh'
    );

    await page.getByLabel(/Nueva Contraseña/i).fill('short');
    await page.getByLabel(/Confirmar Contraseña/i).fill('short');
    await page.getByRole('button', { name: /Actualizar Contraseña/i }).click();

    await expect(page.getByText(/al menos 8 caracteres/i)).toBeVisible();
  });

  test('shows error when password lacks uppercase', async ({ page }) => {
    await page.goto(
      '/auth/reset-password#access_token=fake-token&refresh_token=fake-refresh'
    );

    await page.getByLabel(/Nueva Contraseña/i).fill('test1234');
    await page.getByLabel(/Confirmar Contraseña/i).fill('test1234');
    await page.getByRole('button', { name: /Actualizar Contraseña/i }).click();

    await expect(page.getByText(/al menos una letra mayúscula/i)).toBeVisible();
  });

  test('shows error when password lacks lowercase', async ({ page }) => {
    await page.goto(
      '/auth/reset-password#access_token=fake-token&refresh_token=fake-refresh'
    );

    await page.getByLabel(/Nueva Contraseña/i).fill('TEST1234');
    await page.getByLabel(/Confirmar Contraseña/i).fill('TEST1234');
    await page.getByRole('button', { name: /Actualizar Contraseña/i }).click();

    await expect(page.getByText(/al menos una letra minúscula/i)).toBeVisible();
  });

  test('shows error when password lacks digit', async ({ page }) => {
    await page.goto(
      '/auth/reset-password#access_token=fake-token&refresh_token=fake-refresh'
    );

    await page.getByLabel(/Nueva Contraseña/i).fill('Testabcd');
    await page.getByLabel(/Confirmar Contraseña/i).fill('Testabcd');
    await page.getByRole('button', { name: /Actualizar Contraseña/i }).click();

    await expect(page.getByText(/al menos un número/i)).toBeVisible();
  });
});
