# Performance Testing (k6)

## Scope

- API load and user-journey scenarios live in `tests/performance/k6/`.
- Browser + API hybrid tests live in `tests/performance/k6/browser/`.

## External k6 Libraries

- `https://jslib.k6.io/k6-utils/1.4.0/index.js`
  - Used through `tests/performance/k6/lib/jslib.js`.
  - Provides `randomIntBetween`, `randomItem`, and `uuidv4` for realistic data generation.

## Main Commands

```bash
npm run perf:smoke
npm run perf:load
npm run perf:stress
npm run perf:spike
npm run perf:soak
npm run perf:journey
```

## Required Environment Variables

- `BASE_URL` (default: `http://localhost:3000`)
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `TEST_USER_POOL_SIZE` (optional, default: `10`)

## Full App Journey Scenario

- File: `tests/performance/k6/scenarios/full-app-user-flow.js`
- Covers:
  - dashboard + core reads
  - accounts and categories
  - transactions (create/update/list/delete)
  - transfers
  - recurring transactions
  - profile + subscription status
  - rates and scraper health
  - waitlist (low-frequency public funnel path)
