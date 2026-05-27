# Tasks: Rates Scraper Recovery

## Source artifacts

- PRD: `docs/prd-rates-scraper-recovery.md`
- Architecture: `docs/architecture/rates-scraper-architecture.md`
- Prior fix: `openspec/changes/fix-rates-scraper-fallback/`

## Delivery strategy

Implement in small reviewable slices. Do not mix UI, scheduler, DB schema, and alerting in one large PR.

Recommended order:

1. Contract and domain model.
2. Scrape pipeline use case.
3. Persistence and health model.
4. Scheduler and locking.
5. API contracts.
6. Admin recovery.
7. UI stale states.
8. Alerting and runbook.

## Task checklist

### Phase 0 — Discovery and decisions

- [ ] Confirm production scheduler owner.
  - Options: external cron, Supabase function, Vercel/hosting cron, app background manager.
  - Output: documented owner in PR/open spec/runbook.
- [ ] Confirm freshness thresholds.
  - Default: fresh <= 24h, incident > 48h, hard failure > 7d.
  - Output: accepted thresholds in config documentation.
- [ ] Confirm hard-stale product behavior.
  - Decide whether conversion actions warn or block after hard failure.
  - Output: UI/product decision recorded.
- [ ] Confirm alert recipients.
  - Output: engineering/admin notification path.
- [ ] Inventory current rate surfaces.
  - Include landing, dashboard, rate selector, conversion display, hooks.
  - Output: list of UI files requiring stale/fallback behavior.

### Phase 1 — Shared contract and domain

- [ ] Create shared rates freshness types.
  - Suggested file: `lib/rates/freshness-types.ts` or existing rates domain location.
  - Include: `RateFreshness`, `RateSource`, `RateFallbackReason`, `RateResponseMetadata`.
- [ ] Implement `FreshnessPolicy`.
  - Inputs: rate timestamp, current time, threshold config.
  - Outputs: `fresh`, `stale-warning`, `incident`, `hard-failure`.
- [ ] Implement `RateUsabilityPolicy`.
  - Decide whether stale data is usable for read-only display or conversion.
  - Static fallback must never be authoritative.
- [ ] Add config parsing for thresholds.
  - Env/config keys for fresh, incident, hard-failure windows.
  - Validate invalid config loudly.
- [ ] Add unit tests for freshness boundaries.
  - Exactly 24h.
  - 24h + 1ms/minute.
  - Exactly 48h.
  - More than 7d.
  - Missing timestamp.

Acceptance:

- [ ] Domain code has no Next.js imports.
- [ ] Domain code has no Supabase imports.
- [ ] Freshness state is deterministic with injected clock.

### Phase 2 — Parser validation hardening

- [ ] Review current `lib/scrapers/bcv-scraper.ts` validation.
  - Confirm USD and EUR are both mandatory.
  - Confirm fallback data cannot pass as live data.
- [ ] Add fixture coverage for BCV markup variants.
  - Existing fixtures: `tests/fixtures/bcv/`.
  - Add mutated fixture for missing USD.
  - Add mutated fixture for missing EUR.
  - Add mutated fixture for changed container order.
- [ ] Add parser tests.
  - Full USD/EUR extraction succeeds.
  - USD-only extraction fails.
  - EUR-only extraction fails.
  - Non-numeric values fail.
  - Static fallback result is marked failed/fallback.
- [ ] Keep optional live smoke test gated.
  - Use existing `RUN_LIVE_SCRAPER_TESTS=1` pattern.

Acceptance:

- [ ] Partial scrape cannot produce successful live rates.
- [ ] Parser failure includes machine-readable reason.

### Phase 3 — Scrape attempt model

- [ ] Define `ScrapeAttempt` type.
  - Fields: `attemptId`, `provider`, `trigger`, `stage`, `status`, `failureReason`, `startedAt`, `finishedAt`, `extractedCurrencies`, `metadata`.
- [ ] Define failure-stage enum.
  - `scheduler`, `fetch`, `parse`, `validate`, `persist`, `circuit-breaker`, `rate-limit`, `unknown`.
- [ ] Add attempt persistence strategy.
  - Option A: table/migration for scrape attempts.
  - Option B: health-side persisted JSON if table is deferred.
  - Prefer table if implementation moves beyond prototype.
- [ ] Add repository port for attempts.
  - `recordAttemptStart`.
  - `recordAttemptSuccess`.
  - `recordAttemptFailure`.
  - `getLatestAttempts`.
- [ ] Add tests for attempt recording.
  - Success path.
  - Failure stage mapping.
  - Metadata stored without leaking secrets.

Acceptance:

- [ ] Health can explain last failure stage.
- [ ] Manual recovery can return attempt ID.

### Phase 4 — Persistence hardening

- [ ] Inspect current repository contracts.
  - `repositories/contracts/exchange-rates-repository.ts`.
  - `repositories/contracts/rates-history-repository.ts`.
- [ ] Confirm latest snapshot write behavior.
  - Must persist USD and EUR together.
  - Must fail loudly if one write fails.
- [ ] Confirm history write behavior.
  - Successful scrape writes history when applicable.
- [ ] Add transactional boundary or compensating failure behavior.
  - Use Supabase RPC/transaction if available.
  - Otherwise fail latest write before history side effects or record partial failure clearly.
- [ ] Add repository integration tests.
  - Latest + history success.
  - Latest write failure.
  - History write failure.
  - Attempt record linked to persisted snapshot.

Acceptance:

- [ ] No silent DB write failure.
- [ ] Rate data timestamp is source timestamp, not response timestamp.

### Phase 5 — Scrape pipeline use case

- [ ] Create `ScrapeAndPersistRates` use case.
  - Inputs: provider, trigger, optional override options.
  - Dependencies: source client, parser, repositories, lock, clock, metrics, alert sink.
- [ ] Add lock acquisition.
  - Duplicate scrape returns `skipped_locked`.
  - Lock has TTL.
  - Stale lock expires safely.
- [ ] Add circuit breaker check.
  - Repeated failures block normal scheduled/on-demand attempts.
  - Manual override requires audit reason.
- [ ] Add rate limit check.
  - Prevent burst retries against BCV.
- [ ] Add timeout handling.
  - Fetch timeout.
  - Total pipeline timeout if needed.
- [ ] Map every failure to stage/reason.
  - Fetch failure.
  - Parse failure.
  - Validation failure.
  - Persistence failure.
- [ ] Emit structured logs/metrics.
  - Start.
  - Success.
  - Failure.
  - Skipped.

Acceptance:

- [ ] Scheduler, on-demand, and manual recovery use same use case.
- [ ] Static fallback never becomes successful pipeline output.

### Phase 6 — Scheduler ownership and heartbeat

- [ ] Choose production scheduler path.
  - Avoid multiple active owners.
- [ ] Add scheduler heartbeat record.
  - Updated on every scheduler invocation, including skipped/blocked runs.
- [ ] Wire scheduler to `ScrapeAndPersistRates(trigger: scheduled)`.
- [ ] Add duplicate-instance protection.
  - Distributed lock required in production.
- [ ] Add scheduler tests.
  - Successful scheduled scrape.
  - Locked duplicate skip.
  - Circuit breaker skip.
  - Heartbeat updates on skip.

Acceptance:

- [ ] Health endpoint can distinguish scheduler dead vs scraper failing.
- [ ] Production has one documented scheduler owner.

### Phase 7 — Read API contract

- [ ] Update `GET /api/bcv-rates` response schema.
  - Include: `success`, `rates`, `source`, `timestamp`, `ageMinutes`, `freshness`, `fallback`, `stale`, `fromLiveScrape`, `fallbackReason`.
- [ ] Add `GetCurrentRates` use case.
  - Reads latest snapshot.
  - Applies freshness policy.
  - Optionally attempts bounded on-demand recovery when missing/hard-stale.
- [ ] Define strict unavailable response.
  - Non-2xx when no usable current data exists for strict route behavior.
- [ ] Add API tests.
  - Fresh DB data.
  - Stale warning DB data.
  - Incident DB data.
  - Hard-stale DB data + live scrape succeeds.
  - Hard-stale DB data + live scrape fails.
  - DB empty + live scrape succeeds.
  - DB empty + live scrape fails.

Acceptance:

- [ ] API never returns static fallback as fresh success.
- [ ] On-demand recovery marks `fromLiveScrape: true`.
- [ ] Error responses expose machine-readable reason.

### Phase 8 — Health API

- [ ] Extend `GET /api/scrapers/health` for BCV.
  - Status.
  - Freshness.
  - Last success.
  - Last failure.
  - Last failure stage.
  - Failure count window.
  - Scheduler heartbeat.
  - Circuit breaker state.
  - Lock state.
  - Source URL.
- [ ] Add health aggregation use case.
  - Reads latest snapshot, attempt records, scheduler heartbeat, circuit breaker state.
- [ ] Add health tests.
  - Healthy fresh.
  - Degraded stale.
  - Incident stale.
  - Scheduler missing heartbeat.
  - Parser failure stage.
  - Persistence failure stage.

Acceptance:

- [ ] Month-long fallback would be visible from health response.
- [ ] Health identifies likely failure stage.

### Phase 9 — Manual recovery endpoint

- [ ] Add protected route.
  - Proposed: `app/api/admin/rates/recover/route.ts`.
- [ ] Add authorization.
  - Admin/session/service-token check.
  - No public access.
- [ ] Add request contract.
  - `provider`, `reason`, `overrideCircuitBreaker`.
- [ ] Add audit logging.
  - Actor.
  - Reason.
  - Override flag.
  - Result.
  - Attempt ID.
- [ ] Call `ScrapeAndPersistRates(trigger: manual)`.
- [ ] Add tests.
  - Unauthorized rejected.
  - Authorized success.
  - Circuit breaker blocked without override.
  - Override requires reason.
  - Audit record written.

Acceptance:

- [ ] Operator can trigger one safe scrape.
- [ ] Manual action cannot bypass parser validation.

### Phase 10 — UI stale/fallback states

- [ ] Update shared client type for rates response.
  - Avoid UI components inferring freshness from raw timestamp.
- [ ] Update `hooks/use-bcv-rates.ts`.
  - Expose freshness, stale, fallback, source, age.
- [ ] Update visible rate components.
  - `components/currency/bcv-rates.tsx`.
  - `components/exchange-rate-display.tsx`.
  - `app/(public)/components/live-rates-section.tsx`.
  - Any dashboard/rate selector surfaces found during inventory.
- [ ] Add copy for states.
  - Fresh: normal timestamp.
  - Stale warning: “Tasa desactualizada”.
  - Incident: stronger warning.
  - Hard failure/unavailable: outage state; no official/current claim.
- [ ] Add component tests.
  - Fresh display.
  - Stale badge.
  - Fallback badge.
  - Unavailable state.
  - Conversion blocking/warning if chosen.

Acceptance:

- [ ] UI never presents fallback as official/current.
- [ ] Users can see timestamp and state.

### Phase 11 — Alerting and metrics

- [ ] Add metrics emission.
  - `rates_bcv_age_minutes`.
  - `rates_bcv_scrape_success_total`.
  - `rates_bcv_scrape_failure_total{stage,reason}`.
  - `rates_bcv_fallback_response_total`.
  - `rates_bcv_scheduler_heartbeat_age_minutes`.
- [ ] Add alert rule for >48h stale.
- [ ] Add alert rule for missing scheduler heartbeat.
- [ ] Add alert rule for repeated parse failures.
- [ ] Add alert payload details.
  - Provider.
  - Age.
  - Last success.
  - Last failure stage/reason.
  - Link to health endpoint or admin page.
- [ ] Add tests or dry-run verification for alert conditions.

Acceptance:

- [ ] Fallback cannot persist for weeks without team notification.
- [ ] Alert identifies likely owner/action.

### Phase 12 — Runbook

- [ ] Create operations runbook.
  - Suggested path: `docs/runbooks/rates-scraper-recovery.md`.
- [ ] Include diagnosis flow.
  - Check health.
  - Check scheduler heartbeat.
  - Check latest attempt.
  - Check failure stage.
  - Trigger manual recovery.
  - Escalate parser/DB/scheduler issue.
- [ ] Include common failures.
  - BCV markup changed.
  - Scheduler stopped.
  - Supabase write failed.
  - Circuit breaker open.
  - Rate limit active.
- [ ] Include verification commands.
  - Focused Jest tests.
  - Optional live smoke test.

Acceptance:

- [ ] Support/engineering can diagnose stale rates without reading code first.

### Phase 13 — Verification

- [ ] Run focused parser tests.
  - `npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts --runInBand`
- [ ] Run focused API tests.
  - `npx jest --selectProjects node --runTestsByPath tests/node/api/bcv-rates-route.test.ts --runInBand`
- [ ] Run new domain/use-case tests.
- [ ] Run new health endpoint tests.
- [ ] Run UI component tests for stale/fallback states.
- [ ] Run type check.
  - `npm run type-check`
- [ ] Run optional live smoke test before release.
  - `RUN_LIVE_SCRAPER_TESTS=1 npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper.node.test.ts --runInBand`

Acceptance:

- [ ] RED/GREEN evidence recorded for new behavior.
- [ ] Live smoke is clearly marked optional/external.
- [ ] Unrelated existing failures are separated from scraper scope.

## Suggested PR slicing

### PR 1 — Domain contract

Includes:

- Freshness types.
- Freshness policy.
- API response type updates.
- Domain tests.

Review risk: low.

### PR 2 — Scrape pipeline and attempts

Includes:

- `ScrapeAndPersistRates` use case.
- Attempt model.
- Lock/rate-limit/circuit-breaker integration.
- Use-case tests.

Review risk: medium.

### PR 3 — Persistence and scheduler

Includes:

- Attempt persistence/migration if needed.
- Latest/history hardening.
- Scheduler heartbeat.
- Repository/scheduler tests.

Review risk: medium-high.

### PR 4 — APIs and health

Includes:

- `/api/bcv-rates` contract.
- `/api/scrapers/health` expansion.
- API tests.

Review risk: medium.

### PR 5 — Manual recovery and audit

Includes:

- Admin recovery endpoint.
- Auth/audit.
- Endpoint tests.

Review risk: medium, security-sensitive.

### PR 6 — UI stale states

Includes:

- Hook response updates.
- Badges/copy/unavailable states.
- Component tests.

Review risk: medium.

### PR 7 — Alerts and runbook

Includes:

- Metrics/alert wiring.
- Runbook.
- Dry-run verification.

Review risk: low-medium.

## Definition of done

- [ ] Current BCV rate state is visible in API, health, logs, and UI.
- [ ] No endpoint presents static fallback as fresh official data.
- [ ] Stale >48h triggers alert.
- [ ] Scheduler heartbeat proves production job is alive.
- [ ] Manual recovery works and is audited.
- [ ] Parser validates USD and EUR together.
- [ ] DB persistence failure is observable.
- [ ] UI shows stale/fallback/unavailable states clearly.
- [ ] Tests cover domain, parser, API, scheduler, health, persistence, and UI.
- [ ] Runbook explains recovery from month-long fallback.
