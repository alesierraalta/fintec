import {
  defineConfig,
  devices,
  type ReporterDescription,
} from '@playwright/test';

const AUTH_REQUIRED_TAG = /@auth-required/;
const DEFAULT_LANE = 'no-auth';
const DEFAULT_GLOBAL_TIMEOUT_MS = process.env.CI
  ? 20 * 60 * 1000
  : 12 * 60 * 1000;
const parseBooleanEnv = (value: string | undefined): boolean | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no'].includes(normalized)) {
    return false;
  }

  return undefined;
};
const lane =
  process.env.PLAYWRIGHT_LANE === 'auth-required'
    ? 'auth-required'
    : DEFAULT_LANE;
const isAuthRequiredLane = lane === 'auth-required';
const reuseExistingServer =
  parseBooleanEnv(process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER) ??
  !process.env.CI;
const reporter: ReporterDescription[] = process.env.CI
  ? [['line'], ['html', { open: 'never' }]]
  : [['list'], ['html', { open: 'never' }]];

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  testMatch: isAuthRequiredLane ? ['**/*.spec.ts'] : ['e2e/**/*.spec.ts'],
  testIgnore: [
    '**/*.test.ts',
    '**/__tests__/**',
    '**/unit/**',
    '**/integration/**',
  ],
  globalTimeout:
    Number.parseInt(process.env.PLAYWRIGHT_GLOBAL_TIMEOUT_MS ?? '', 10) ||
    DEFAULT_GLOBAL_TIMEOUT_MS,
  grep: isAuthRequiredLane ? AUTH_REQUIRED_TAG : undefined,
  grepInvert: isAuthRequiredLane ? undefined : AUTH_REQUIRED_TAG,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Auth-required coverage shares one canonical user and mutates session state. */
  workers: isAuthRequiredLane ? 1 : process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter,
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
    ...(isAuthRequiredLane
      ? [{ name: 'setup', testMatch: /.*\.setup\.ts/ }]
      : []),

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(isAuthRequiredLane
          ? { storageState: 'playwright/.auth/user.json' }
          : {}),
      },
      ...(isAuthRequiredLane ? { dependencies: ['setup'] } : {}),
    },

    ...(isAuthRequiredLane
      ? []
      : [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
            },
          },

          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
            },
          },

          /* Test against mobile viewports. */
          {
            name: 'Mobile Chrome',
            use: {
              ...devices['Pixel 5'],
            },
          },
          {
            name: 'Mobile Safari',
            use: {
              ...devices['iPhone 12'],
            },
          },
        ]),

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
    timeout:
      Number.parseInt(process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS ?? '', 10) ||
      120_000,
    reuseExistingServer,
    gracefulShutdown: {
      signal: 'SIGTERM',
      timeout: 5_000,
    },
  },
});
