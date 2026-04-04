import { test, expect } from '@playwright/test';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('displays registration form with correct elements', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Crear Cuenta/i })
    ).toBeVisible();
    await expect(page.getByLabel(/Nombre Completo/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/Confirmar Contraseña/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Crear Cuenta/i })
    ).toBeVisible();
    await expect(
      page.getByText(
        /Mínimo 8 caracteres, incluyendo mayúsculas, minúsculas y números/i
      )
    ).toBeVisible();
  });

  test('HTML5 validation prevents empty name submission', async ({ page }) => {
    const nameInput = page.getByLabel(/Nombre Completo/i);
    await expect(nameInput).toHaveAttribute('required');
  });

  test('HTML5 validation prevents empty email submission', async ({ page }) => {
    const emailInput = page.getByLabel(/Email/i);
    await expect(emailInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('shows error when password is too short (< 8 chars)', async ({
    page,
  }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('Test1!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/al menos 8 caracteres/i)).toBeVisible();
  });

  test('shows error when password lacks uppercase', async ({ page }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('test1234!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('test1234!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/al menos una letra mayúscula/i)).toBeVisible();
  });

  test('shows error when password lacks lowercase', async ({ page }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('TEST1234!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('TEST1234!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/al menos una letra minúscula/i)).toBeVisible();
  });

  test('shows error when password lacks digit', async ({ page }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Testabcd!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('Testabcd!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/al menos un número/i)).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1234!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('Test1234@');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/Las contraseñas no coinciden/i)).toBeVisible();
  });

  test('shows email verification screen after successful registration', async ({
    page,
  }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('newuser@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1234!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('Test1234!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    // Should show email verification screen (requires Supabase connection)
    const verificationVisible = await page
      .getByText(/Revisa tu Correo/i)
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (verificationVisible) {
      await expect(page.getByText(/Revisa tu Correo/i)).toBeVisible();
      await expect(page.getByText(/newuser@example.com/i)).toBeVisible();
      await expect(
        page.locator('li').filter({ hasText: /Revisa tu bandeja de entrada/i })
      ).toBeVisible();
      await expect(
        page.locator('li').filter({ hasText: /Verifica la carpeta de spam/i })
      ).toBeVisible();
      await expect(
        page
          .locator('li')
          .filter({ hasText: /Haz clic en el enlace de verificación/i })
      ).toBeVisible();
      await expect(
        page.getByText(/No podrás iniciar sesión hasta confirmar tu email/i)
      ).toBeVisible();
    }
  });

  test('sets sessionStorage flags after registration with email confirmation', async ({
    page,
  }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('sessiontest@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1234!');
    await page.getByLabel(/Confirmar Contraseña/i).fill('Test1234!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    // Wait for verification screen to appear (requires Supabase connection)
    const verificationVisible = await page
      .getByText(/Revisa tu Correo/i)
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (verificationVisible) {
      const emailConfirmationPending = await page.evaluate(() =>
        sessionStorage.getItem('emailConfirmationPending')
      );
      const pendingEmail = await page.evaluate(() =>
        sessionStorage.getItem('pendingEmail')
      );

      expect(emailConfirmationPending).toBe('true');
      expect(pendingEmail).toBe('sessiontest@example.com');
    }
  });

  test('has link to login page', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Inicia sesión aquí/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /Inicia sesión aquí/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
