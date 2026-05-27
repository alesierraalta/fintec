# PR1 Domain Apply Handoff

## Status

Implemented PR1/Phase 1 rates freshness domain contract with strict TDD.

## RED Evidence

- Command: `npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts`
- Exit: 1
- Expected fail: 3 suites failed with module-not-found for new `@/lib/rates/*` modules.

## GREEN / Validation Evidence

- `npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts` — exit 0; initial worker run: 3 suites, 8 tests passed; final parent-verified run after review coverage repair: 3 suites, 9 tests passed.
- `npm test -- --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts` — exit 0; 2 suites, 6 tests passed.
- `npm run type-check` — exit 0.
- `npm run lint` — exit 0; 400 warnings, 0 errors.

## Changed Files

- `lib/rates/freshness-types.ts`
- `lib/rates/freshness-policy.ts`
- `lib/rates/rate-usability-policy.ts`
- `lib/rates/freshness-config.ts`
- `tests/node/rates/freshness-policy.test.ts`
- `tests/node/rates/rate-usability-policy.test.ts`
- `tests/node/rates/freshness-config.test.ts`
- `openspec/changes/fix-rates-scraper-fallback/apply-progress.md`
- `rate-scraper/pr1-domain-apply.md`

## Implemented

- Freshness/source/fallback metadata types.
- `FreshnessPolicy.evaluate()` with injected `now`, exact 24h/48h boundaries, fail-safe missing/invalid/future timestamp handling.
- `RateUsabilityPolicy.evaluate()` that blocks authoritative conversion for fallback/unavailable/hard-failure rates.
- `parseFreshnessThresholdConfig()` for `RATES_FRESH_WINDOW_HOURS`, `RATES_INCIDENT_WINDOW_HOURS`, `RATES_HARD_FAILURE_WINDOW_HOURS`.

## Not Touched

API routes, UI, scheduler, DB repositories, migrations, scraper behavior, dirty existing docs/registry.

## Budget

Source/test implementation after review coverage repair: 328 LOC. Commit-worthy PR1 total including apply-progress evidence: 373 lines. Generated `rate-scraper/*` handoff artifacts excluded unless explicitly staged. Under 400 budget.

## Blockers / Decisions

None. Engram tool unavailable in this child, so memory persistence not performed here.
