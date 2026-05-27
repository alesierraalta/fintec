# PRD: Rates Scraper Recovery

## Decision

Build production-grade recovery for the rates scraper so FinTec stops serving month-old fallback rates as if they were usable financial data.

The current BCV fallback fix protects one API path from silently succeeding with static data, but the product still needs an operational recovery layer: freshness rules, scheduler ownership, monitoring, alerts, operator controls, and user-facing stale-state behavior.

## Problem

Rates have been in fallback for more than one month. For a financial product, this is not a degraded cosmetic state; it means currency conversion, account views, budgets, exchange displays, and trust signals can be based on stale or synthetic rates.

Existing evidence:

- `openspec/changes/fix-rates-scraper-fallback/` already fixed the narrow bug where `/api/bcv-rates` could return static fallback with `success: true`.
- `BCVScraper` now requires both USD and EUR extraction for a valid live result.
- `/api/bcv-rates` now attempts one bounded live scrape when the database is empty and returns HTTP 503 with fallback metadata when live data is unavailable.
- The unresolved product risk is broader: no clear production freshness SLO, no alerting threshold, no recovery runbook, no owner-visible incident state, and no guarantee background sync is healthy.

## Goals

| Goal                    | Outcome                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| Stop silent stale data  | Any stale or fallback rate is explicit in API, UI, logs, and monitoring.        |
| Restore live rates      | Background and on-demand scraping reliably refresh BCV USD/EUR rates.           |
| Detect failures fast    | Team knows within minutes, not weeks, when rates stop updating.                 |
| Protect financial trust | User-facing flows avoid presenting fallback rates as authoritative.             |
| Make recovery operable  | Operators can inspect, retry, and validate scraper health without code changes. |

## Non-goals

- Replace BCV as the source of truth.
- Add paid FX providers in the first iteration.
- Redesign all currency UI.
- Change financial calculation rules unrelated to exchange-rate freshness.
- Add historical analytics beyond what is needed for freshness and recovery.

## Users and stakeholders

| Stakeholder   | Need                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| End users     | Know whether displayed exchange rates are current, stale, or unavailable. |
| Product/admin | See current scraper status and last successful update.                    |
| Engineering   | Debug parser, scheduler, DB write, and API fallback failures quickly.     |
| Support       | Explain rate outages with confidence and timestamps.                      |

## Scope

### In scope

1. Freshness policy for BCV rates.
2. Background scraper health and scheduling verification.
3. API contract for stale, fallback, and unavailable rates.
4. UI stale/fallback indicators in rate display surfaces.
5. Alerting when freshness exceeds threshold.
6. Admin/operator recovery endpoint or action.
7. Tests covering parser, API semantics, scheduler, DB persistence, and UI stale states.

### Out of scope

1. Multi-provider market-rate aggregation.
2. Binance P2P rate parity work unless it shares freshness infrastructure.
3. Manual rate editing by non-admin users.
4. Mobile-native changes unless existing web contract breaks mobile consumers.

## Product requirements

### R1 — Rate freshness contract

System must classify every BCV rate response using explicit freshness metadata.

Required fields:

| Field            | Meaning                                                       |
| ---------------- | ------------------------------------------------------------- |
| `success`        | Request produced usable data for the requested purpose.       |
| `fallback`       | Response includes static or synthetic fallback data.          |
| `stale`          | Latest persisted/live rate is older than freshness threshold. |
| `source`         | `database`, `live-scrape`, `fallback`, or `unavailable`.      |
| `timestamp`      | Timestamp of rate data, not response generation time.         |
| `ageMinutes`     | Age of rate data at response time.                            |
| `fallbackReason` | Machine-readable reason when fallback or unavailable.         |
| `fromLiveScrape` | True only when request recovered via live scrape.             |

Acceptance:

- Fresh data returns `success: true`, `fallback: false`, `stale: false`.
- Stale database data returns explicit `stale: true`.
- Static fallback never returns as fresh authoritative data.
- Unavailable live and database data returns non-2xx for strict endpoints.

### R2 — Freshness thresholds

Define production thresholds in configuration.

| Threshold     | Default     | Behavior                                                             |
| ------------- | ----------- | -------------------------------------------------------------------- |
| Fresh         | <= 24 hours | Normal display.                                                      |
| Stale warning | > 24 hours  | UI warning + health degraded.                                        |
| Incident      | > 48 hours  | Alert engineering/admin.                                             |
| Hard failure  | > 7 days    | Disable authoritative conversion claims; show explicit outage state. |

Acceptance:

- Thresholds are configurable without code deploy.
- Health endpoint reports current freshness band.
- Tests verify threshold boundaries.

### R3 — Background scraper reliability

Background scraper must refresh BCV USD/EUR at predictable intervals and persist successful snapshots.

Acceptance:

- Scheduler has one clear owner in production.
- Duplicate scraper instances cannot race or spam BCV.
- Successful scrape writes both current snapshot and history when applicable.
- Failed scrape records reason, timestamp, and retry metadata.
- Circuit breaker state is visible in health output.

### R4 — On-demand recovery

When current DB data is missing or hard-stale, API may attempt one bounded live scrape if rate limiting and circuit breaker allow it.

Acceptance:

- On-demand scrape has timeout and retry ceiling.
- On-demand scrape never hides failure behind `success: true` fallback.
- Response identifies `fromLiveScrape: true` when recovery succeeds.
- Failure returns explicit unavailable/fallback metadata.

### R5 — Observability and alerting

System must alert before fallback lasts a business day.

Acceptance:

- Emit structured logs for scrape start, success, parse failure, network failure, DB write failure, stale threshold breach, and fallback response.
- Health endpoint includes last successful scrape, last failure, failure count, freshness band, circuit breaker state, and source URL.
- Alert fires when BCV data is older than 48 hours.
- Alert includes likely failure stage: scheduler, network, parser, validation, or persistence.

### R6 — User-facing stale states

UI must not present stale/fallback rates as normal current rates.

Acceptance:

- Rate displays show timestamp and stale/fallback badge when data is not fresh.
- Conversion surfaces block or warn when hard-failure threshold is crossed.
- Empty/unavailable state explains that rates are temporarily unavailable.
- UI copy avoids claiming official/current rate when source is fallback.

### R7 — Operator recovery

Admin/operator must be able to inspect and trigger safe recovery.

Acceptance:

- Protected endpoint or admin action triggers one manual scrape.
- Manual action respects auth, rate limits, timeout, and circuit breaker override rules.
- Result returns parse status, extracted currencies, persistence result, and next scheduled run.
- Recovery action is audited.

## Technical requirements

| Area          | Requirement                                                                            |
| ------------- | -------------------------------------------------------------------------------------- |
| Parser        | BCV parse is valid only when USD and EUR are both extracted.                           |
| Persistence   | Latest snapshot and history writes are transactional or fail loudly.                   |
| API           | Strict consumers get non-2xx when no usable current rate exists.                       |
| Config        | Freshness thresholds, scrape interval, timeout, and retry count are env/config driven. |
| Tests         | Unit, API, scheduler, integration, and UI stale-state coverage.                        |
| Security      | Manual recovery endpoint requires admin/service authorization.                         |
| Rate limiting | Scraper protects BCV from burst retries.                                               |

## Success metrics

| Metric                                   | Target                                                 |
| ---------------------------------------- | ------------------------------------------------------ |
| Time in fallback                         | < 1 hour per incident.                                 |
| Detection time                           | < 10 minutes after stale threshold breach.             |
| Recovery time                            | < 30 minutes after alert acknowledgement.              |
| Freshness                                | 99% of production responses use rates <= 24 hours old. |
| Silent fallback responses                | 0.                                                     |
| Static fallback as successful fresh data | 0.                                                     |

## Release plan

### Phase 1 — Contract and tests

- Lock API freshness schema.
- Add regression tests for stale/fallback semantics.
- Add UI contract tests for badges and unavailable state.

### Phase 2 — Scheduler and persistence hardening

- Verify production scheduler entrypoint.
- Add persistence success/failure telemetry.
- Add circuit breaker and retry visibility.

### Phase 3 — Observability

- Extend `/api/scrapers/health` with freshness bands and failure stage.
- Add structured logs.
- Add alert rule for >48h stale data.

### Phase 4 — Operator recovery

- Add protected manual scrape trigger.
- Add audit logging.
- Document runbook.

### Phase 5 — UI rollout

- Add stale/fallback badges where rates appear.
- Add hard-failure copy for unavailable rates.
- Verify landing, dashboard, rate selector, and conversion surfaces.

## Acceptance checklist

- [ ] BCV rates cannot be stale for more than 48 hours without alerting.
- [ ] API responses always expose freshness and fallback metadata.
- [ ] Static fallback is never presented as current official data.
- [ ] Background scraper health shows scheduler, parser, DB, and circuit-breaker state.
- [ ] Admin/operator can trigger one safe scrape and see result.
- [ ] UI visibly distinguishes fresh, stale, fallback, and unavailable rates.
- [ ] Regression tests cover parser, API, scheduler, health, and UI states.
- [ ] Runbook explains how to diagnose month-long fallback.

## Risks

| Risk                             | Mitigation                                                           |
| -------------------------------- | -------------------------------------------------------------------- |
| BCV markup changes again         | Parser fixture tests + live smoke test + failure-stage alerts.       |
| Production scheduler not running | Health check includes scheduler heartbeat and last run timestamp.    |
| DB write silently fails          | Persistence telemetry and integration test against repository layer. |
| UI consumers ignore metadata     | Shared response type and component-level stale-state tests.          |
| Alert fatigue                    | Freshness bands separate warning, incident, and hard failure.        |

## Open questions

1. What production job owns scheduled scraping today: Next route trigger, background manager, Supabase function, or external cron?
2. Should stale rates remain usable for read-only display after 48 hours, or should all conversion actions block?
3. Who receives scraper alerts?
4. Is Binance fallback governed by the same freshness policy, or BCV only for this PRD?
5. Do admin tools already exist, or should recovery start as an authenticated API endpoint?

## Review path

1. Confirm freshness thresholds.
2. Confirm production scheduler owner.
3. Confirm user-facing behavior for hard-stale rates.
4. Convert this PRD into OpenSpec proposal/design/tasks before implementation.
