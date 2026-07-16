const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Jest's <rootDir> interpolation breaks on Windows when the project path
// contains a `\.` sequence (e.g. auxiliary worktrees under `.claude\worktrees`):
// replacePathSepForGlob/Regex keep `\.` as an escape instead of a separator,
// so testMatch globs and ignore regexes silently stop matching. Using the
// absolute root with forward slashes avoids the faulty interpolation.
const ROOT = __dirname.replace(/\\/g, '/');

// Add any custom config to be passed to Jest
const customJestConfig = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  projects: [
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: [
        `${ROOT}/tests/**/*.test.{js,jsx,ts,tsx}`,
        `${ROOT}/**/*.test.{js,jsx,ts,tsx}`,
        `!${ROOT}/tests/node/**/*.test.{js,jsx,ts,tsx}`, // Exclude node tests
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^cheerio$': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(@ai-sdk|ai|@supabase|jose|uuid)/)',
      ],
      testPathIgnorePatterns: [
        `${ROOT}/.next/`,
        `${ROOT}/node_modules/`,
        `${ROOT}/tests/node/`,
        `${ROOT}/tests/e2e/`,
        `${ROOT}/.stryker-tmp/`,
        `${ROOT}/.agent/`,
        `${ROOT}/.agents/`,
        `${ROOT}/.claude/`,
      ],
      collectCoverageFrom: [
        'components/**/*.{js,jsx,ts,tsx}',
        'lib/!(*scrapers*)/**/*.{js,jsx,ts,tsx}',
        'repositories/**/*.{js,jsx,ts,tsx}',
        'hooks/**/*.{js,jsx,ts,tsx}',
        '!**/*.d.ts',
      ],
      moduleDirectories: ['node_modules', '<rootDir>/'],
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: [`${ROOT}/tests/node/**/*.test.{js,jsx,ts,tsx}`], // Only include node tests
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^cheerio$': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(@ai-sdk|ai|@supabase|jose|uuid)/)',
      ],
      testPathIgnorePatterns: [
        `${ROOT}/.next/`,
        `${ROOT}/node_modules/`,
        `${ROOT}/tests/e2e/`,
        `${ROOT}/.stryker-tmp/`,
        `${ROOT}/.agent/`,
        `${ROOT}/.agents/`,
        `${ROOT}/.claude/`,
      ],
      collectCoverageFrom: ['lib/scrapers/**/*.{js,jsx,ts,tsx}', '!**/*.d.ts'],
      moduleDirectories: ['node_modules', '<rootDir>/'],
    },
  ],
  // Default for other tests
  testPathIgnorePatterns: [
    `${ROOT}/tests/e2e/`,
    `${ROOT}/.stryker-tmp/`,
    `${ROOT}/.claude/`,
  ], // Ignored globally
  transformIgnorePatterns: [
    '/node_modules/(?!(@ai-sdk|ai|@supabase|jose|uuid)/)',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
