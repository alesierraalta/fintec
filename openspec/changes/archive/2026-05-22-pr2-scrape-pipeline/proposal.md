# Proposal: Rate Scraper Pipeline and Attempt Model

## Intent

The BCV scraper runs ad-hoc with no structured attempt tracking, no
distributed lock, and no orchestrator use case. Failures are opaque:
health shows success/failure counts but not which stage failed
(fetch vs parse vs validate vs persist). Add a pipeline use case
that records every attempt with failure stage, guarded by a lock
and circuit breaker.

## Scope

### In Scope

- `ScrapeStage` enum and `ScrapeAttempt` type.
- `ScrapeAttemptsRepository` port and implementation.
- `ScrapeAndPersistRates` use case: lock → circuit-breaker check
  → scrape → validate → persist → record attempt.
- In-memory lock with TTL (distributed-ready interface).
- Unit tests for attempt model, lock, pipeline orchestration.

### Out of Scope

- Scheduler ownership and heartbeat (Phase 6 — PR3).
- Supabase migration for attempts table (Phase 4 — PR3).
- Read API contract changes (Phase 7 — PR4).
- Health endpoint expansion (PR4).
- Manual recovery endpoint (PR5).
- UI stale states (PR6).
- Alerting and runbook (PR7).

## Approach

1. Add `ScrapeStage` enum + `ScrapeAttempt` type to
   `lib/rates/scrape-types.ts`.
2. Add `ScrapeAttemptsRepository` interface to
   `repositories/contracts/scrape-attempts-repository.ts`.
3. Add in-memory `SimpleLock` with TTL (port interface so Supabase
   advisory lock can replace later).
4. Add `ScrapeAndPersistRates` use case in
   `lib/rates/scrape-pipeline.ts` that composes: acquire lock →
   check circuit breaker → `scrapeBCVRates()` → persist via
   `ExchangeRateDatabase` → record attempt.
5. Reuse existing `BaseScraper.circuitBreaker`, `withRetry`,
   `HealthMonitor`, and `ExchangeRateDatabase`.
6. Tests in `tests/node/rates/scrape-pipeline.test.ts`.

## Affected Areas

| Area                                                   | Impact   | Description                          |
| ------------------------------------------------------ | -------- | ------------------------------------ |
| `lib/rates/scrape-types.ts`                            | New      | ScrapeStage enum, ScrapeAttempt type |
| `lib/rates/scrape-pipeline.ts`                         | New      | ScrapeAndPersistRates use case       |
| `lib/rates/simple-lock.ts`                             | New      | In-memory TTL lock                   |
| `repositories/contracts/scrape-attempts-repository.ts` | New      | Attempt persistence port             |
| `repositories/contracts/index.ts`                      | Modified | Re-export new contract               |
| `tests/node/rates/scrape-pipeline.test.ts`             | New      | Pipeline, lock, attempt tests        |

## Risks

| Risk                                      | Likelihood | Mitigation                                         |
| ----------------------------------------- | ---------- | -------------------------------------------------- |
| In-memory lock lost on serverless restart | Medium     | Port interface lets Supabase PG lock replace later |
| Attempt table migration deferred          | Low        | In-memory Map store first, repository port ready   |

## Rollback Plan

Remove `lib/rates/scrape-types.ts`, `lib/rates/scrape-pipeline.ts`,
`lib/rates/simple-lock.ts`, and the new test file. Revert
`repositories/contracts/index.ts`. No data changes.

## Success Criteria

- [ ] `ScrapeAndPersistRates` returns `attemptId` and result.
- [ ] Lock prevents concurrent duplicate BCV scrapes.
- [ ] Failure path records specific `ScrapeStage` (fetch, parse,
      validate, persist).
- [ ] Circuit breaker open skips scrape without attempting.
- [ ] All tests pass and type-check is clean.
