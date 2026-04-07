# SDD Exploration: Supabase Backend Testing Hardening

## 1. Database Migrations & Schema Coverage

- **State:** 14 migrations currently exist in `supabase/migrations/`.
- **Strengths:** Robust Git hooks (`scripts/testing/supabase-hook-checks.mjs`) enforce that every `.sql` migration file is referenced by at least one `*migration*.test.ts` file in Node tests.
- **Gaps:** Schema validation is done via Node integration tests. No native database-level tests (`pgTAP`) were found.

## 2. RLS / Security / Auth Coverage

- **State:** RLS is enabled by default per project conventions (`SKILL.md`).
- **Strengths:** Node tests like `transactions-ownership-scope.test.ts` verify data access boundaries at the repository layer.
- **Gaps:** No native RLS testing in Postgres. Testing RLS from the Node layer is slow and prone to false positives if the service role is accidentally used.

## 3. Repository & API Integration Coverage

- **State:** Repositories are tested via Jest (`tests/node/repositories/*.test.ts`).
- **Strengths:** Good coverage of repository logic and domain boundaries.
- **Gaps:** The testing strategy explicitly suggests mocking the Supabase client for unit testing (Pattern 3). While fast, this skips actual constraint, trigger, and RLS validation. API route test coverage is limited (`waitlist.test.ts`, `testing-bootstrap-route.test.ts`).

## 4. Performance & Load Coverage

- **State:** Highly mature.
- **Strengths:** Exhaustive k6 suite covering smoke, load, soak, stress, and spike scenarios (`tests/performance/k6/scenarios/`). npm scripts are fully wired for performance testing.

## 5. Fast-Feedback & Developer Agility

- **State:** Excellent guardrails.
- **Strengths:** Pre-commit/pre-push hooks conditionally run Supabase tests based on changed files using `jest --findRelatedTests` and specific migration path matching.

## Recommended Validation Matrix

| Change Type       | Validation Command / Test Suite                                  |
| ----------------- | ---------------------------------------------------------------- |
| Migration/Schema  | `npm run test:supabase` + Native pgTAP tests (proposed)          |
| RLS Policies      | Native pgTAP tests (`supabase test db`)                          |
| API Endpoints     | API Integration suite (`tests/node/api/`) against Local Supabase |
| High-Volume flows | `npm run perf:smoke` or `npm run perf:load`                      |

## Highest-Value Next Moves

1. **Implement `pgTAP` for Native DB Testing:** Move RLS, trigger, and function testing closer to the database using Supabase's native testing framework (`supabase/tests/`).
2. **Clarify Repository Test Boundaries:** Enforce a strict separation between pure unit tests (mocked DB) and integration tests (hitting local Supabase DB).
3. **Expand API Integration Tests:** Create a baseline of Playwright API tests or Jest API tests for critical backend endpoints.
