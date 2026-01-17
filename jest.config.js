const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  projects: [
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: [
        '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/**/*.test.{js,jsx,ts,tsx}',
        '!<rootDir>/tests/node/**/*.test.{js,jsx,ts,tsx}', // Exclude node tests
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^cheerio$': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js'
      },
      testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/tests/e2e/',
        '<rootDir>/.stryker-tmp/'
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
      testMatch: ['<rootDir>/tests/node/**/*.test.{js,jsx,ts,tsx}'], // Only include node tests
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^cheerio$': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js'
      },
      testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/tests/e2e/',
        '<rootDir>/.stryker-tmp/'
      ],
      collectCoverageFrom: [
        'lib/scrapers/**/*.{js,jsx,ts,tsx}',
        '!**/*.d.ts',
      ],
      moduleDirectories: ['node_modules', '<rootDir>/'],
    }
  ],
  // Default for other tests
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/', '<rootDir>/.stryker-tmp/'], // Ignored globally
  transformIgnorePatterns: [
    // Transform ES modules from these specific packages (AI SDK, etc.)
    '/node_modules/(?!(@ai-sdk|ai|@supabase|jose|uuid)/)'
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
