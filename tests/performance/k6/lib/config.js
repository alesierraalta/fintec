/**
 * FinTec Performance Testing — Environment Configuration
 *
 * Centralized config for all k6 scripts. Uses __ENV for runtime injection
 * via CLI flags or GitHub Actions secrets.
 */

export const CONFIG = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  supabaseUrl: __ENV.SUPABASE_URL || 'http://localhost:54321',
  supabaseAnonKey: __ENV.SUPABASE_ANON_KEY || '',

  // Test user pool
  testUserEmail: __ENV.TEST_USER_EMAIL || 'perf-test@fintec.test',
  testUserPassword: __ENV.TEST_USER_PASSWORD || 'perf-test-password',
  testUserPoolSize: parseInt(__ENV.TEST_USER_POOL_SIZE || '10', 10),

  // API paths (relative to baseUrl)
  api: {
    transactions: '/api/transactions',
    accounts: '/api/accounts',
    categories: '/api/categories',
    trends: '/api/trends',
    transfers: '/api/transfers',
    binanceRates: '/api/binance-rates',
    bcvRates: '/api/bcv-rates',
    authProfile: '/api/auth/profile',
    scrapersHealth: '/api/scrapers/health',
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
