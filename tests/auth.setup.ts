import { expect, test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';
const AUTH_REQUIRED_LANE = 'auth-required';

function failSetup(message: string): never {
  throw new Error(`[auth.setup] ${message}`);
}

setup('authenticate for auth-required lane', async ({ page }) => {
  const lane = process.env.PLAYWRIGHT_LANE ?? 'no-auth';
  const bypass = (process.env.FRONTEND_AUTH_BYPASS ?? '').toLowerCase();

  if (lane !== AUTH_REQUIRED_LANE) {
    failSetup(
      `This setup can run only in PLAYWRIGHT_LANE=${AUTH_REQUIRED_LANE}. Current lane: ${lane}.`
    );
  }

  if (['1', 'true', 'yes'].includes(bypass)) {
    failSetup('FRONTEND_AUTH_BYPASS must be disabled in auth-required lane.');
  }

  page.setDefaultTimeout(60_000);

  await page.goto('/auth/login', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.fill('input[name="email"]', 'test@fintec.com');
  await page.fill('input[name="password"]', 'Test123!');

  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
    timeout: 20_000,
  });

  await page.context().storageState({ path: authFile });
  console.log(`[auth.setup] Saved authenticated storage state at ${authFile}`);
});
