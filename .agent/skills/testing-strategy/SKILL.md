---
name: testing-strategy
description: >
  Comprehensive testing strategy for FinTec: unit, integration, E2E, and mutation testing.
  Trigger: Writing tests, setting up test infrastructure, or ensuring code quality.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Writing tests, testing components, or ensuring test coverage'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Writing unit tests for components or utilities
- Creating integration tests for repositories or services
- Setting up E2E tests with Playwright
- Configuring test coverage requirements
- Running mutation tests with Stryker
- Debugging failing tests

---

## Critical Patterns

### Pattern 1: Unit Testing React Components

```typescript
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Pattern 2: Testing Money Utilities

```typescript
// lib/money.test.ts
import { Money } from './money';

describe('Money', () => {
  describe('fromMajor', () => {
    it('should convert dollars to cents correctly', () => {
      const money = Money.fromMajor(10.50, 'USD');
      expect(money.getMinorAmount()).toBe(1050);
    });
    
    it('should handle floating point precision', () => {
      const money = Money.fromMajor(0.1 + 0.2, 'USD'); // 0.30000000000000004
      expect(money.getMinorAmount()).toBe(30);
    });
  });
  
  describe('add', () => {
    it('should add money correctly', () => {
      const a = Money.fromMajor(10, 'USD');
      const b = Money.fromMajor(5.50, 'USD');
      const sum = a.add(b);
      
      expect(sum.getMajorAmount()).toBe(15.50);
      expect(sum.getMinorAmount()).toBe(1550);
    });
    
    it('should throw when adding different currencies', () => {
      const usd = Money.fromMajor(10, 'USD');
      const eur = Money.fromMajor(10, 'EUR');
      
      expect(() => usd.add(eur)).toThrow('Cannot add different currencies');
    });
  });
});
```

### Pattern 3: Testing Repositories with Mocks

```typescript
// repositories/local/transactions-repository.test.ts
import { LocalTransactionsRepository } from './transactions-repository';
import { db } from './db';

jest.mock('./db', () => ({
  db: {
    transactions: {
      where: jest.fn(),
      toArray: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('LocalTransactionsRepository', () => {
  let repository: LocalTransactionsRepository;
  
  beforeEach(() => {
    repository = new LocalTransactionsRepository();
    jest.clearAllMocks();
  });
  
  describe('findAll', () => {
    it('should return all transactions for user', async () => {
      const mockTransactions = [
        { id: '1', userId: 'user1', amount: 1000, currency: 'USD' },
        { id: '2', userId: 'user1', amount: 2000, currency: 'USD' },
      ];
      
      (db.transactions.where as jest.Mock).mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockTransactions),
      });
      
      const result = await repository.findAll('user1');
      
      expect(result).toEqual(mockTransactions);
      expect(db.transactions.where).toHaveBeenCalledWith('userId').equals('user1');
    });
  });
});
```

### Pattern 4: E2E Testing with Playwright

```typescript
// tests/e2e/transactions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should create a new transaction', async ({ page }) => {
    // Navigate to transactions
    await page.goto('/transactions');
    
    // Click create button
    await page.click('button:has-text("New Transaction")');
    
    // Fill form
    await page.fill('[name="amount"]', '25.50');
    await page.selectOption('[name="type"]', 'EXPENSE');
    await page.fill('[name="description"]', 'Groceries');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('text=Transaction created')).toBeVisible();
    await expect(page.locator('text=Groceries')).toBeVisible();
  });
  
  test('should filter transactions by type', async ({ page }) => {
    await page.goto('/transactions');
    
    // Apply filter
    await page.click('[data-testid="filter-button"]');
    await page.click('text=Expenses');
    
    // Verify filtered results
    const transactions = page.locator('[data-testid="transaction-item"]');
    await expect(transactions).toHaveCount(3);
  });
});
```

### Pattern 5: API Route Testing

```typescript
// app/api/transactions/route.test.ts
import { POST } from './route';
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { transactionsRepository } from '@/repositories';

jest.mock('@/lib/auth');
jest.mock('@/repositories');

describe('POST /api/transactions', () => {
  it('should create transaction for authenticated user', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' };
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    
    const mockTransaction = {
      id: 'tx1',
      userId: 'user1',
      amount: 1000,
      currency: 'USD',
      type: 'EXPENSE',
    };
    (transactionsRepository.create as jest.Mock).mockResolvedValue(mockTransaction);
    
    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        amount: 1000,
        currency: 'USD',
        type: 'EXPENSE',
      }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data).toEqual(mockTransaction);
  });
  
  it('should return 401 for unauthenticated user', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    
    const request = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000 }),
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(401);
  });
});
```

---

## Test Coverage Requirements

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'repositories/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
};
```

---

## Mutation Testing

### Stryker Configuration

```json
{
  "mutator": "typescript",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "lib/**/*.ts",
    "!lib/**/*.test.ts"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

---

## Testing Best Practices

### DO

- ✅ Test behavior, not implementation
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Mock external dependencies
- ✅ Test edge cases and error conditions
- ✅ Keep tests isolated and independent

### DON'T

- ❌ Test internal implementation details
- ❌ Write tests that depend on each other
- ❌ Use magic numbers without explanation
- ❌ Skip error case testing
- ❌ Test third-party libraries
- ❌ Write overly complex tests

---

## Test Organization

```
tests/
├── unit/                    # Unit tests
│   ├── components/
│   ├── lib/
│   └── repositories/
├── integration/             # Integration tests
│   ├── api/
│   └── services/
└── e2e/                     # End-to-end tests
    ├── auth.spec.ts
    ├── transactions.spec.ts
    └── reports.spec.ts
```

---

## Mocking Patterns

### Mock Supabase Client

```typescript
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    })),
  })),
}));
```

### Mock Next.js Router

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));
```

---

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Decision Tree

```
Testing React component?       → Use @testing-library/react
Testing utility function?      → Use Jest with unit tests
Testing API route?             → Mock dependencies, test handler
Testing user flow?             → Use Playwright E2E tests
Need to verify test quality?   → Run mutation tests with Stryker
Testing money operations?      → Test edge cases and precision
Testing async operations?      → Use async/await, waitFor
```

---

## Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Run mutation tests
npm run test:mutate

# Run specific test file
npm test -- transactions.test.ts

# Update snapshots
npm test -- -u
```

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:coverage
      - run: npx playwright install --with-deps
      - run: npm run e2e
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Resources

- **Jest Config**: See [jest.config.js](file:///c:/Users/ismar/Documents/projects/fintec/jest.config.js)
- **Jest Setup**: See [jest.setup.js](file:///c:/Users/ismar/Documents/projects/fintec/jest.setup.js)
- **Playwright Config**: See [playwright.config.ts](file:///c:/Users/ismar/Documents/projects/fintec/playwright.config.ts)
- **Stryker Config**: See [stryker.config.json](file:///c:/Users/ismar/Documents/projects/fintec/stryker.config.json)
- **Test Files**: See [tests/](file:///c:/Users/ismar/Documents/projects/fintec/tests/)
