import { expect, test } from '@playwright/test';
import { bootstrapCanonicalFixtures } from '@/tests/support/auth/bootstrap';
import { getCanonicalTestUserConfig } from '@/tests/support/auth/canonical-user';

const canonicalUser = getCanonicalTestUserConfig();

test.describe('Supabase Auth Smoke @auth-required', () => {
  test('logs in through the real auth lane, bootstraps fixtures, and opens transactions', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Run this real-auth smoke only on the primary Chromium lane'
    );

    const bootstrap = await bootstrapCanonicalFixtures(page);

    expect(bootstrap.account.id).toBeTruthy();
    expect(bootstrap.profile.email).toBe(canonicalUser.email);
    expect(bootstrap.profile.displayName).toBe(canonicalUser.displayName);

    await page.goto('/transactions', { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(/\/auth\//);
    await expect(page.getByText(/Transacciones/i).first()).toBeVisible();
    await expect(page.getByText(/Todas las Transacciones/i)).toBeVisible();
  });
});
