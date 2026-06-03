/**
 * T1.8 — No-auth lane: Google Sign-In button presence smoke
 *
 * Satisfies: REQ-01 (SCN-01) and REQ-02 (SCN-02)
 * Lane: no-auth (no @auth-required tag; file lives under tests/e2e/ so it is
 *       included by playwright.config.ts testMatch: ['e2e/**\/*.spec.ts'] and
 *       excluded from the auth-required lane via grepInvert).
 *
 * These tests do NOT trigger the Google OAuth flow. They only assert that the
 * GoogleSignInButton is rendered and accessible on the login and register pages.
 * The button uses aria-label="Continue with Google" (English, a11y compliant)
 * while the visible label is the Spanish text from OAUTH_PROVIDERS — we target
 * the accessible name because it is the stable contract from REQ-01/02.
 *
 * No network calls to Google are made. No environment vars required beyond the
 * running dev server (PLAYWRIGHT_LANE=no-auth or omitted).
 */

import { test, expect } from '@playwright/test';

test.describe('Google Sign-In button presence (no-auth lane)', () => {
  // SCN-01: /auth/login shows the Google button, visible and enabled
  test('SCN-01: /auth/login renders an enabled Google Sign-In button', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    const googleBtn = page.getByRole('button', {
      name: 'Continue with Google',
    });

    await expect(googleBtn).toBeVisible({ timeout: 10_000 });
    await expect(googleBtn).toBeEnabled();
  });

  // SCN-02: /auth/register shows the Google button
  test('SCN-02: /auth/register renders a visible Google Sign-In button', async ({
    page,
  }) => {
    await page.goto('/auth/register');

    const googleBtn = page.getByRole('button', {
      name: 'Continue with Google',
    });

    await expect(googleBtn).toBeVisible({ timeout: 10_000 });
  });
});
