import { defineConfig, devices } from '@playwright/test';

const skipAuthSetup = ['1', 'true', 'yes'].includes(
  (process.env.PLAYWRIGHT_NO_AUTH_SETUP ?? '').toLowerCase()
);

// Frontend protected-page bypass is controlled in app code with FRONTEND_AUTH_BYPASS.
// The no-auth workflow should set both flags:
// - PLAYWRIGHT_NO_AUTH_SETUP=1 skips auth.setup.ts
// - FRONTEND_AUTH_BYPASS=1 allows server page guards to avoid /auth/login redirects
const authStorageState = skipAuthSetup
  ? undefined
  : 'playwright/.auth/user.json';
const authDependencies = skipAuthSetup ? undefined : ['setup'];

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    ...(skipAuthSetup ? [] : [{ name: 'setup', testMatch: /.*\.setup\.ts/ }]),

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved auth state for all tests
        storageState: authStorageState,
      },
      dependencies: authDependencies,
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: authStorageState,
      },
      dependencies: authDependencies,
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: authStorageState,
      },
      dependencies: authDependencies,
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: authStorageState,
      },
      dependencies: authDependencies,
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: authStorageState,
      },
      dependencies: authDependencies,
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
