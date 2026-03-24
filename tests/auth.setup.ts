import { expect, test as setup } from '@playwright/test';
import {
  CANONICAL_AUTH_REQUIRED_LANE,
  getCanonicalTestUserConfig,
} from './support/auth/canonical-user';
import { bootstrapCanonicalFixtures } from './support/auth/bootstrap';

const authFile = 'playwright/.auth/user.json';
const canonicalUser = getCanonicalTestUserConfig();

function failSetup(message: string): never {
  throw new Error(`[auth.setup] ${message}`);
}

setup(
  'authenticate for auth-required lane @auth-required',
  async ({ page }) => {
    const lane = process.env.PLAYWRIGHT_LANE ?? 'no-auth';
    const bypass = (process.env.FRONTEND_AUTH_BYPASS ?? '').toLowerCase();

    if (lane !== CANONICAL_AUTH_REQUIRED_LANE) {
      failSetup(
        `This setup can run only in PLAYWRIGHT_LANE=${CANONICAL_AUTH_REQUIRED_LANE}. Current lane: ${lane}.`
      );
    }

    if (['1', 'true', 'yes'].includes(bypass)) {
      failSetup('FRONTEND_AUTH_BYPASS must be disabled in auth-required lane.');
    }

    page.setDefaultTimeout(60_000);

    await page.goto('/auth/login', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.fill('input[name="email"]', canonicalUser.email);
    await page.fill('input[name="password"]', canonicalUser.password);

    await page.click('button[type="submit"]');

    try {
      await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
        timeout: 20_000,
      });
    } catch {
      const authErrors = await page
        .locator('p.text-destructive')
        .allInnerTexts();
      const authError = authErrors.find((value) => value.trim().length > 0);

      failSetup(
        authError
          ? `Login failed before bootstrap: ${authError}`
          : 'Login failed before bootstrap: the session never left /auth/.'
      );
    }

    const bootstrap = await bootstrapCanonicalFixtures(page);
    expect(bootstrap.profile.baseCurrency).toBe(canonicalUser.baseCurrency);

    await page.context().storageState({ path: authFile });
    console.log(
      `[auth.setup] Saved authenticated storage state at ${authFile} with canonical account ${bootstrap.account.id}`
    );
  }
);
