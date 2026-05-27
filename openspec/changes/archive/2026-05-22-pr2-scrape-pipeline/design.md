# Design: Rate Scraper Pipeline and Attempt Model

## Technical Approach

Compose a `ScrapeAndPersistRates` use case that wraps the existing
`scrapeBCVRates()` with a distributed lock and attempt recording.
Each attempt captures which stage failed, so health can answer "why
is the scraper down?" instead of just "is it down?"

## Architecture Decisions

### Decision: Pipeline wraps BaseScraper, not replaces

| Option                                           | Tradeoff                                                |
| ------------------------------------------------ | ------------------------------------------------------- |
| Pipeline calls BaseScraper.scrape()              | Reuses circuit breaker, retry, timeout — no duplication |
| Pipeline implements its own fetch/parse/validate | Duplicates BaseScraper logic, breaks abstraction        |

**Choice**: Pipeline calls `scrapeBCVRates()`. Stage mapping infers
the failure stage from `ScraperError.category` and `ScraperError.code`
returned by the scraper.

### Decision: In-memory Map-backed lock with port interface

| Option                    | Tradeoff                                  |
| ------------------------- | ----------------------------------------- |
| In-memory Map + TTL       | Simple, no DB dependency, lost on restart |
| Supabase PG advisory lock | Durable across restarts, needs connection |
| Redis                     | Another infra dependency                  |

**Choice**: In-memory `SimpleLock` with a `Lock` interface. Future
PR swaps to PG advisory lock without changing the use case.

### Decision: Attempts stored in-memory Map (deferred table)

| Option                           | Tradeoff                    |
| -------------------------------- | --------------------------- |
| In-memory Map                    | Zero setup, lost on restart |
| Supabase `scrape_attempts` table | Durable, needs migration    |

**Choice**: In-memory store implementing
`ScrapeAttemptsRepository`. Table migration deferred to PR3.

## Data Flow

```
Client/Scheduler
     │
     ▼
ScrapeAndPersistRates
     │
     ├─ 1. acquireLock("bcv-scrape")
     │     └─ fail → skipped_locked
     │
     ├─ 2. scrapeBCVRates()
     │     ├─ success → {usd, eur, ...}
     │     └─ fail → ScraperResult { error, category }
     │
     ├─ 3. If success → ExchangeRateDatabase.storeExchangeRate()
     │     └─ fail → stage=persist
     │
     └─ 4. recordAttempt(attemptId, stage, status)
           └─ ScrapeAttemptsRepository
```

## File Changes

| File                                                   | Action | Description                              |
| ------------------------------------------------------ | ------ | ---------------------------------------- |
| `lib/rates/scrape-types.ts`                            | Create | `ScrapeStage` enum, `ScrapeAttempt` type |
| `lib/rates/scrape-pipeline.ts`                         | Create | `ScrapeAndPersistRates` use case         |
| `lib/rates/simple-lock.ts`                             | Create | In-memory TTL lock with `Lock` interface |
| `repositories/contracts/scrape-attempts-repository.ts` | Create | Attempt persistence port                 |
| `repositories/contracts/index.ts`                      | Modify | Re-export new contract                   |
| `tests/node/rates/scrape-pipeline.test.ts`             | Create | Pipeline, lock, attempt tests            |

## Interfaces / Contracts

### Lock interface

```typescript
export interface Lock {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}
```

### ScrapeAttemptsRepository port

```typescript
export interface ScrapeAttemptsRepository {
  recordAttempt(attempt: ScrapeAttempt): Promise<void>;
  getLatestAttempts(limit?: number): Promise<ScrapeAttempt[]>;
}
```

### Stage mapping from ScraperError

| Error Category         | Mapped Stage    |
| ---------------------- | --------------- |
| TIMEOUT / CONNECTIVITY | fetch           |
| PARSING                | parse           |
| VALIDATION             | validate        |
| RATE_LIMIT             | rate-limit      |
| Circuit breaker code   | circuit-breaker |

## Testing Strategy

| Layer | What                  | Approach                                                                      |
| ----- | --------------------- | ----------------------------------------------------------------------------- |
| Unit  | SimpleLock            | Acquire/release/expiry, concurrent acquires                                   |
| Unit  | ScrapeAndPersistRates | Mock scrape + DB + repo → lock skip, scrape failure, persist failure, success |
| Unit  | Stage mapping         | Each error category → correct ScrapeStage                                     |

## Migration / Rollout

No migration required. In-memory stores mean zero setup.

## Open Questions

None.
