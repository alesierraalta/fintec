/**
 * FinTec Performance Testing — Environment Configuration
 *
 * Centralized config for all k6 scripts. Uses __ENV for runtime injection
 * via CLI flags or GitHub Actions secrets.
 */

export const CONFIG = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  supabaseUrl:
    __ENV.SUPABASE_URL ||
    __ENV.NEXT_PUBLIC_SUPABASE_URL ||
    'http://localhost:54321',
  supabaseAnonKey:
    __ENV.SUPABASE_ANON_KEY || __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  // Test user pool
  testUserEmail:
    __ENV.FINTEC_TEST_USER_EMAIL ||
    __ENV.E2E_CANONICAL_USER_EMAIL ||
    __ENV.TEST_USER_EMAIL ||
    'test@fintec.com',
  testUserPassword:
    __ENV.FINTEC_TEST_USER_PASSWORD ||
    __ENV.E2E_CANONICAL_USER_PASSWORD ||
    __ENV.TEST_USER_PASSWORD ||
    'Test123!',
  testUserPoolSize: parseInt(__ENV.TEST_USER_POOL_SIZE || '10', 10),

  // API paths (relative to baseUrl)
  api: {
    transactions: '/api/transactions',
    accounts: '/api/accounts',
    categories: '/api/categories',
    trends: '/api/trends',
    transfers: '/api/transfers',
    recurringTransactions: '/api/recurring-transactions',
    subscriptionStatus: '/api/subscription/status',
    binanceRates: '/api/binance-rates',
    bcvRates: '/api/bcv-rates',
    authProfile: '/api/auth/profile',
    scrapersHealth: '/api/scrapers/health',
    waitlist: '/api/waitlist',
  },

  // Supabase Auth paths
  auth: {
    token: '/auth/v1/token?grant_type=password',
    signup: '/auth/v1/signup',
  },

  // Pages for browser tests
  pages: {
    home: '/',
    dashboard: '/dashboard',
    transactions: '/transactions',
    accounts: '/accounts',
    reports: '/reports',
  },
};

/**
 * Build a full URL from a relative API path.
 */
export function apiUrl(path) {
  return `${CONFIG.baseUrl}${path}`;
}

/**
 * Build a full Supabase Auth URL.
 */
export function authUrl(path) {
  return `${CONFIG.supabaseUrl}${path}`;
}
