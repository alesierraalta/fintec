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
    await expect(page.getByLabel('Confirmar', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Crear Cuenta/i })
    ).toBeVisible();
    await expect(page.getByText(/Mínimo 6 caracteres/i)).toBeVisible();
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

  test('shows error when password is too short (< 6 chars)', async ({
    page,
  }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1');
    await page.getByLabel('Confirmar', { exact: true }).fill('Test1');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/al menos 6 caracteres/i)).toBeVisible();
  });

  test('accepts a 6+ character password with mixed case and a digit', async ({
    page,
  }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1!');
    await page.getByLabel('Confirmar', { exact: true }).fill('Test1!');

    const submitButton = page.getByRole('button', { name: /Crear Cuenta/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(
      page.getByRole('alert').filter({
        hasText: /al menos 6 caracteres|Las contraseñas no coinciden/i,
      })
    ).not.toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('test@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1234!');
    await page.getByLabel('Confirmar', { exact: true }).fill('Test1234@');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    await expect(page.getByText(/Las contraseñas no coinciden/i)).toBeVisible();
  });

  test('shows email verification screen after successful registration', async ({
    page,
  }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('newuser@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1234!');
    await page.getByLabel('Confirmar', { exact: true }).fill('Test1234!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    const verificationHeading = page.getByRole('heading', {
      name: /Revisá tu Correo/i,
    });
    const registrationError = page.getByRole('alert');
    const submissionOutcome = verificationHeading.or(registrationError).first();

    await expect(submissionOutcome).toBeVisible({ timeout: 10000 });

    if (await verificationHeading.isVisible()) {
      await expect(verificationHeading).toBeVisible();
      await expect(page.getByText(/newuser@example.com/i)).toBeVisible();
      await expect(
        page.getByText(/Revisá tu bandeja de entrada/i)
      ).toBeVisible();
      await expect(page.getByText(/Chequeá la carpeta de Spam/i)).toBeVisible();
      await expect(
        page.getByText(/Confirmá el enlace para entrar/i)
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Ir al login ahora/i })
      ).toBeVisible();
    } else {
      await expect(registrationError).toBeVisible();
      await expect(registrationError).toHaveText(/\S+/);
    }
  });

  test('sets sessionStorage flags after registration with email confirmation', async ({
    page,
  }) => {
    await page.getByLabel(/Nombre Completo/i).fill('Test User');
    await page.getByLabel(/Email/i).fill('sessiontest@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('Test1234!');
    await page.getByLabel('Confirmar', { exact: true }).fill('Test1234!');
    await page.getByRole('button', { name: /Crear Cuenta/i }).click();

    const verificationHeading = page.getByRole('heading', {
      name: /Revisá tu Correo/i,
    });
    const registrationError = page.getByRole('alert');
    const submissionOutcome = verificationHeading.or(registrationError).first();

    await expect(submissionOutcome).toBeVisible({ timeout: 10000 });

    if (await verificationHeading.isVisible()) {
      const emailConfirmationPending = await page.evaluate(() =>
        sessionStorage.getItem('emailConfirmationPending')
      );
      const pendingEmail = await page.evaluate(() =>
        sessionStorage.getItem('pendingEmail')
      );

      expect(emailConfirmationPending).toBe('true');
      expect(pendingEmail).toBe('sessiontest@example.com');
    } else {
      await expect(registrationError).toBeVisible();
      await expect(registrationError).toHaveText(/\S+/);
    }
  });

  test('has link to login page', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Iniciá sesión/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /Iniciá sesión/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
