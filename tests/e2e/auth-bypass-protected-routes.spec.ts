import { expect, test } from '@playwright/test';

const isNoAuthBypassMode = ['1', 'true', 'yes'].includes(
  (process.env.FRONTEND_AUTH_BYPASS ?? '').toLowerCase()
);
const isNoAuthSetupMode = ['1', 'true', 'yes'].includes(
  (process.env.PLAYWRIGHT_NO_AUTH_SETUP ?? '').toLowerCase()
);
const lane = process.env.PLAYWRIGHT_LANE ?? 'no-auth';

test.describe('Frontend auth bypass protected routes', () => {
  test.skip(
    lane !== 'no-auth',
    'This suite only runs in PLAYWRIGHT_LANE=no-auth.'
  );

  test.skip(
    !isNoAuthSetupMode,
    'Run this suite with PLAYWRIGHT_NO_AUTH_SETUP enabled.'
  );

  test('allows protected frontend routes without login redirect', async ({
    page,
  }) => {
    test.skip(
      !isNoAuthBypassMode,
      'Bypass route checks require FRONTEND_AUTH_BYPASS enabled.'
    );

    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    const transactionsPage = await page.context().newPage();
    await transactionsPage.goto('/transactions');
    await expect(transactionsPage).toHaveURL(/\/transactions$/);
    await transactionsPage.close();
  });

  test('keeps auth-protected APIs unauthorized without session', async ({
    page,
  }) => {
    const response = await page.request.get('/api/accounts?active=true');

    expect(response.status()).toBe(401);
  });

  test('redirects unauthenticated users when bypass is disabled', async ({
    page,
  }) => {
    test.skip(
      isNoAuthBypassMode,
      'This check runs only when FRONTEND_AUTH_BYPASS is disabled.'
    );

    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
