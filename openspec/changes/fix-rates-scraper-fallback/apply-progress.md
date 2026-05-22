# Apply Progress: Fix Rates Scraper Fallback

## Status

Implemented with TDD evidence.

## RED

Command:

```bash
npx jest --selectProjects node tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts --runInBand 2>&1
```

Evidence:

- `tests/node/scrapers/bcv-scraper-fallback.test.ts` failed because `hasCompleteBCVRates` did not exist.
- `tests/node/api/bcv-rates-route.test.ts` failed because DB-empty path returned `success: true` with `BCV (fallback - static-default)` instead of live scrape / 503 behavior.

## GREEN

Changes:

- Added `hasCompleteBCVRates` type guard and required complete USD+EUR BCV extraction before success.
- Removed successful mixed live/static BCV transform path.
- Added DB-empty live scrape recovery to `/api/bcv-rates`.
- Changed DB/live failure path to HTTP 503 with explicit fallback metadata.

Focused verification:

```bash
npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts --runInBand 2>&1
```

Result: PASS — 2 suites, 6 tests.

Type-check:

```bash
npm run type-check 2>&1
```

Result: PASS.

Live scraper verification:

```bash
RUN_LIVE_SCRAPER_TESTS=1 npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper.node.test.ts --runInBand 2>&1
```

Result: PASS — 1 suite, 7 tests.

## Notes

- Broad node-suite failures are unrelated and pre-existing.

---

## PR1 / Phase 1 Rates Freshness Domain Contract

## Status

Implemented with strict TDD evidence. Scope limited to pure domain modules and node unit tests.

## TDD Cycle Evidence

| Cycle | Phase         | Command                                                                                                                                                                                 | Result          | Evidence                                                                                     |
| ----- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| 1     | RED           | `npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts` | FAIL (expected) | 3 suites failed with module-not-found for new `@/lib/rates/*` imports before implementation. |
| 1     | GREEN         | `npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts` | PASS            | 3 suites, 9 tests passed after review coverage repair.                                       |
| 1     | TRIANGULATE   | `npm test -- --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts`                                            | PASS            | 2 suites, 6 nearby scraper/API tests passed.                                                 |
| 1     | REFACTOR/GATE | `npm run type-check`                                                                                                                                                                    | PASS            | TypeScript project check completed with exit code 0.                                         |
| 1     | REFACTOR/GATE | `npm run lint`                                                                                                                                                                          | PASS            | oxlint completed with 400 warnings and 0 errors.                                             |

## Files Changed

- `lib/rates/freshness-types.ts`
- `lib/rates/freshness-policy.ts`
- `lib/rates/rate-usability-policy.ts`
- `lib/rates/freshness-config.ts`
- `tests/node/rates/freshness-policy.test.ts`
- `tests/node/rates/rate-usability-policy.test.ts`
- `tests/node/rates/freshness-config.test.ts`

## Completed Tasks

- Added shared rates freshness/source/fallback metadata types.
- Added deterministic `FreshnessPolicy` with injected `now` and fail-safe handling for missing, invalid, future, and hard-stale timestamps.
- Added `RateUsabilityPolicy` so fallback/unavailable/hard-failure rates cannot be authoritative for conversion.
- Added parser for `RATES_FRESH_WINDOW_HOURS`, `RATES_INCIDENT_WINDOW_HOURS`, and `RATES_HARD_FAILURE_WINDOW_HOURS` with strict order validation.
- Added focused node tests covering boundaries, usability, and config parsing.

## Deviations From Design

- No API, UI, DB, scheduler, migration, or scraper integration done in PR1 by approved scope.
- Existing OpenSpec task checkboxes for prior fallback change were left unchanged because this PR1 domain slice is a new task-family slice and existing tasks.md maps earlier fallback work.

## Remaining Tasks

- Integrate freshness metadata into read API response in later slice.
- Wire domain freshness/usability decisions into UI/health/scheduler phases later.

## Workload / PR Boundary

- PR boundary: PR1 / Phase 1 domain contract only.
- Changed-line forecast: 328 new LOC across approved source/test files; 373 total commit-worthy PR1 lines including apply-progress evidence, below 400-line budget. Generated `rate-scraper/*` handoff artifacts are excluded from the PR boundary unless explicitly staged.
