# Subscription System Tests

This directory contains comprehensive tests for the FinTec subscription and monetization system.

## Test Suites

### 1. Feature Gates (`feature-gates.spec.ts`)
- Tests access control for different subscription tiers
- Verifies feature visibility and restrictions
- Tests upgrade prompts and modals

### 2. Usage Limits (`usage-limits.spec.ts`)
- Tests transaction count limits
- Tests backup frequency limits
- Verifies usage indicators and warnings
- Tests monthly usage reset

### 3. Stripe Integration (`stripe-integration.spec.ts`)
- Tests pricing page display
- Tests checkout flow initiation
- Tests customer portal access
- Tests success page after payment
- Tests subscription management UI

### 4. AI Features (`ai-features.spec.ts`)
- Tests AI API endpoints require premium
- Tests AI feature visibility in UI
- Tests upgrade prompts for AI features

### 5. Data Retention (`data-retention.spec.ts`)
- Tests 6-month history limit for free tier
- Tests unlimited history for paid tiers
- Tests data export functionality

## Running Tests

```bash
# Run all subscription tests
npm run e2e tests/subscriptions/

# Run specific test file
npx playwright test tests/subscriptions/feature-gates.spec.ts

# Run in UI mode for debugging
npx playwright test tests/subscriptions/ --ui

# Run with specific browser
npx playwright test tests/subscriptions/ --project=chromium
```

## Test Environment Setup

These tests assume:
1. The app is running locally or in test environment
2. Test user accounts exist with different subscription tiers
3. Stripe is in test mode with test API keys
4. OpenAI is mocked or using test keys (for AI tests)

## Test Data

For proper testing, you should have:
- A free tier user account
- A base tier user account  
- A premium tier user account
- Test Stripe customer IDs
- Sample transactions for each user

## Known Limitations

- Some tests are marked with `.skip()` as they require full API auth setup
- Stripe webhook tests require ngrok or similar tunneling
- AI feature tests may have rate limits in test environment

## Adding New Tests

When adding subscription features:
1. Add feature gate tests to verify access control
2. Add usage limit tests if the feature has usage caps
3. Add UI tests for upgrade prompts
4. Update integration tests for payment flow changes

