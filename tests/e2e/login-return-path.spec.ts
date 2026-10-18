import { test, expect } from '@playwright/test';

test.describe('Login Return Path (R4)', () => {
  test('shows the login page when no redirectUrl is stored', async ({
    page,
  }) => {
    // Navigate directly to login page (no redirectUrl stored)
    await page.goto('/auth/login');

    // Login page stays in place and renders the shipped form anchors
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole('heading', { name: 'FinTec' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('authenticated user visiting login is redirected @auth-required', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });
});
