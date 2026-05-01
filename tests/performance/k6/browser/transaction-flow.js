/**
 * FinTec Performance — Transaction Flow (k6 Browser)
 *
 * Purpose: Measure the real user experience of creating a transaction,
 * including form interaction times, navigation, and rendering.
 *
 * Pipeline: Nightly (perf-nightly.yml)
 * Requires: K6_BROWSER_ENABLED=true and Chromium installed
 */

import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { BROWSER_THRESHOLDS } from '../lib/thresholds.js';
import { CONFIG } from '../lib/config.js';

export const options = {
  scenarios: {
    transaction_flow: {
      executor: 'constant-vus',
      vus: 1,
      duration: '3m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: BROWSER_THRESHOLDS,
};

export default async function () {
  const page = await browser.newPage();

  try {
    // 0. Login
    await page.goto(`${CONFIG.baseUrl}/auth/login`, {
      waitUntil: 'networkidle',
    });

    // We assume the test user credentials are in environment variables
    // or hardcoded specifically for test environment
    const email =
      __ENV.FINTEC_TEST_USER_EMAIL ||
      __ENV.E2E_CANONICAL_USER_EMAIL ||
      __ENV.TEST_USER_EMAIL ||
      CONFIG.testUserEmail;
    const password =
      __ENV.FINTEC_TEST_USER_PASSWORD ||
      __ENV.E2E_CANONICAL_USER_PASSWORD ||
      __ENV.TEST_USER_PASSWORD ||
      CONFIG.testUserPassword;

    // Fill login form
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(email);

    const passInput = page.locator('input[type="password"]');
    await passInput.fill(password);

    const loginBtn = page.locator('button[type="submit"]');

    await Promise.all([page.waitForNavigation(), loginBtn.click()]);

    // 1. Navigate to Add Transaction page
    await page.goto(`${CONFIG.baseUrl}/transactions/add`, {
      waitUntil: 'networkidle',
    });

    await page.waitForSelector('h1:has-text("Nueva Transacción")');

    // 2. Click "Gasto" (Expense)
    const expenseBtn = page.locator('button:has-text("Gasto")');
    await expenseBtn.waitFor({ state: 'visible' });
    await expenseBtn.click();

    // 3. Select the first available Account
    // We navigate UP to the section and then find the first button
    const accountSection = page
      .locator('h3:has-text("Cuenta")')
      .locator('xpath=..');
    const firstAccountBtn = accountSection.locator('button').first();
    await firstAccountBtn.waitFor({ state: 'visible' });
    await firstAccountBtn.click();

    // 4. Select the first available Category
    const categorySection = page
      .locator('h3:has-text("Categoría")')
      .locator('xpath=..');
    const firstCategoryBtn = categorySection.locator('button').first();
    await firstCategoryBtn.waitFor({ state: 'visible' });
    await firstCategoryBtn.click();

    // 5. Enter Amount via the custom calculator input
    const amountInput = page.locator(
      'input[aria-label="Monto de la transacción"]'
    );
    await amountInput.waitFor({ state: 'visible' });
    await amountInput.fill('150.50');

    // 6. Enter Description
    const descInput = page.locator('input[placeholder*="¿Para qué"]');
    await descInput.waitFor({ state: 'visible' });
    await descInput.fill('Perf Test k6 Simulation');

    // 7. Enter optional note
    const noteArea = page.locator(
      'textarea[placeholder="Información adicional..."]'
    );
    await noteArea.fill('Automated journey metric collection');

    // 8. Submit Form and wait for navigation back to transactions list
    const submitBtn = page.locator('button[title="Finalizar Transacción"]');

    await Promise.all([page.waitForNavigation(), submitBtn.click()]);

    await check(page, {
      'redirected to transactions listing': (p) =>
        p.url().endsWith('/transactions'),
    });

    sleep(2);
  } finally {
    await page.close();
  }
}
