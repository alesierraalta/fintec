import { test, expect, type Page } from '@playwright/test';
import { getCanonicalTestUserConfig } from './support/auth/canonical-user';

const canonicalUser = getCanonicalTestUserConfig();
const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

async function openUserMenu(page: Page): Promise<void> {
  const userMenuButton = page
    .getByRole('button', {
      name: /abrir men[uú] de usuario|cerrar men[uú] de usuario/i,
    })
    .first();
  await expect(userMenuButton).toBeVisible();
  await userMenuButton.click();
  await expect(
    page.getByRole('button', { name: /cerrar sesi[oó]n/i })
  ).toBeVisible();
}

async function ensureLoginPage(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/auth/login`, { waitUntil: 'networkidle' });

  const emailInput = page.locator('input[name="email"]');
  if (await emailInput.isVisible()) {
    return;
  }

  await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
  await expect(page).not.toHaveURL(/\/auth\//);
  await openUserMenu(page);
  await page.getByRole('button', { name: /cerrar sesi[oó]n/i }).click();
  await page.waitForURL(/\/auth\//, { timeout: 20_000 });
  await expect(emailInput).toBeVisible();
}

async function login(page: Page, rememberMe: boolean): Promise<void> {
  await ensureLoginPage(page);
  await expect(page.locator('input[name="password"]')).toBeVisible();

  await page.fill('input[name="email"]', canonicalUser.email);
  await page.fill('input[name="password"]', canonicalUser.password);

  const rememberMeCheckbox = page.locator('input#remember-me');
  const rememberMeToggle = page.locator('label[for="remember-me"]').first();

  if ((await rememberMeCheckbox.isChecked()) !== rememberMe) {
    await rememberMeToggle.click();
  }

  if (rememberMe) {
    await expect(rememberMeCheckbox).toBeChecked();
  } else {
    await expect(rememberMeCheckbox).not.toBeChecked();
  }

  await page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
    timeout: 20_000,
  });
}

test.describe('Session Persistence @auth-required', () => {
  test('stores remember-me preference when the user opts into persistent login', async ({
    page,
  }) => {
    await login(page, true);

    await expect(page).not.toHaveURL(/\/auth\//);
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('fintec_remember_me'))
      )
      .toBe('true');
  });

  test('keeps remember-me unset when the user logs in without persistence', async ({
    page,
  }) => {
    await login(page, false);

    await expect(page).not.toHaveURL(/\/auth\//);
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('fintec_remember_me'))
      )
      .toBeNull();
  });

  test('clears remember-me preference and protects routes again after sign out', async ({
    page,
  }) => {
    await login(page, true);
    await openUserMenu(page);
    await page.getByRole('button', { name: /cerrar sesi[oó]n/i }).click();
    await page.waitForURL(/\/auth\//, { timeout: 20_000 });

    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('fintec_remember_me'))
      )
      .toBeNull();

    await page.goto(`${APP_URL}/transactions`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/auth\//);
  });

  test('loads the login form cleanly when the auth shell is not active', async ({
    page,
  }) => {
    await ensureLoginPage(page);
    await expect(
      page.getByRole('button', { name: /iniciar sesi[oó]n/i })
    ).toBeVisible();
    await expect(page.locator('input#remember-me')).toBeVisible();
  });
});
