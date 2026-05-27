# PR1 Fresh Review

## Blockers

- None found.

## Fixes worth doing now

- Test gap: exact 7-day boundary not asserted. Contract says `>48h<=7d` = `incident`, `>7d` = `hard-failure`. Code implements exact 7d as `incident` via `ageMs <= thresholds.hardFailureWindowMs` in `lib/rates/freshness-policy.ts:23`, and test asserts `7d + 1ms` hard failure in `tests/node/rates/freshness-policy.test.ts:33-39`, but no exact `hoursAgo(24 * 7)` incident assertion. Add small assertion if parent wants full boundary-proof coverage.
- Test gap: `fallback: true` with non-`fallback` source not asserted. Code blocks it in `lib/rates/rate-usability-policy.ts:20`; tests cover `source: 'fallback'` and `source: 'unavailable'` in `tests/node/rates/rate-usability-policy.test.ts:26-40`. Add one case like `{ source: 'database', fallback: true }` if parent wants explicit fallback flag coverage.

## Optional / deferred

- Existing dirty files outside PR1 scope: `.atl/skill-registry.md`, docs PRD/architecture files, `init.md`, `progress.md`, `rate-scraper/context-pr1-domain.md`. No PR1 blocker, but parent should decide staging boundary.

## Validation confidence

- High for domain correctness. Freshness policy matches required boundaries: missing empty/null hard-fail `lib/rates/freshness-policy.ts:12`; invalid date hard-fail `:15`; future/invalid `now` delta hard-fail `:17-18`; `<=24h` fresh `:21`; `>24h<=48h` stale-warning `:22`; `>48h<=7d` incident `:23`; `>7d` hard-failure `:24`.
- High for fallback/unavailable non-authoritative conversion. `unavailable` blocks display/conversion in `lib/rates/rate-usability-policy.ts:19`; `fallback` flag or source blocks conversion in `:20`; hard-failure blocks conversion in `:21`; only non-fallback non-hard-failure rates are authoritative in `:23-29`.
- Config validation good. Defaults are 24h/48h/7d in `lib/rates/freshness-config.ts:4-9`; env overrides parse hours in `:20-27`; invalid positive/order checks in `:29-42`.
- Architecture clean. `lib/rates/*.ts` imports only local rate modules/types; grep found no Next/Supabase/React/repository/scraper imports.
- Tests pass locally: `npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts` => 3 suites, 8 tests passed.
- TDD evidence plausible: RED/GREEN/gates recorded in `openspec/changes/fix-rates-scraper-fallback/apply-progress.md:55-59` and `rate-scraper/pr1-domain-apply.md:6-15`.
- Review budget OK. Current PR1 source/test/handoff untracked lines = 329; plus apply-progress diff 45 = 374 total, under 400 budget. Apply progress claims budget in `openspec/changes/fix-rates-scraper-fallback/apply-progress.md:86-87`.

## Current git state evidence

- Modified tracked: `.atl/skill-registry.md`, `openspec/changes/fix-rates-scraper-fallback/apply-progress.md`.
- Untracked in PR1 scope: `lib/rates/*`, `tests/node/rates/*`, `rate-scraper/pr1-domain-apply.md`, `rate-scraper/context-pr1-domain.md`.
- Untracked outside PR1 scope: docs PRD/architecture files, `init.md`, `progress.md`.
