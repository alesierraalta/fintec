/**
 * FinTec — Lighthouse CI Configuration
 *
 * Defines which pages to audit, performance assertions, and report output.
 * Uses the 'lighthouse:recommended' preset as baseline with FinTec-specific overrides.
 *
 * @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
 */
module.exports = {
  ci: {
    // ─── Collection ──────────────────────────────────────────
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/transactions',
        'http://localhost:3000/accounts',
      ],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 60000,
      numberOfRuns: 3, // 3 runs per URL for statistical stability
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        // Throttle to simulate real-world conditions
        throttling: {
          cpuSlowdownMultiplier: 1, // Desktop baseline (no throttle)
        },
      },
    },

    // ─── Assertions ──────────────────────────────────────────
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Core Web Vitals (strict)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],

        // Additional performance metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        interactive: ['warn', { maxNumericValue: 3000 }],

        // Composite scores
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        // Resource budget assertions
        'resource-summary:script:size': [
          'warn',
          { maxNumericValue: 307200 }, // 300KB
        ],
        'resource-summary:stylesheet:size': [
          'warn',
          { maxNumericValue: 51200 }, // 50KB
        ],
        'resource-summary:font:count': ['warn', { maxNumericValue: 3 }],

        // Best practices
        'render-blocking-resources': ['warn', { maxLength: 2 }],
        'uses-responsive-images': ['warn', { maxLength: 0 }],
        'unused-javascript': ['warn', { maxLength: 3 }],

        // Relaxed: These may trigger on Next.js SSR pages
        'uses-long-cache-ttl': 'off',
        redirects: 'off',
        'service-worker': 'off',
        'installable-manifest': 'off',
        'works-offline': 'off',
        'apple-touch-icon': 'off',
        'maskable-icon': 'off',
        'splash-screen': 'off',
        'themed-omnibox': 'off',
        'content-width': 'off',
      },
    },

    // ─── Upload ──────────────────────────────────────────────
    upload: {
      target: 'filesystem',
      outputDir: './tests/performance/reports/lighthouse',
    },
  },
};
