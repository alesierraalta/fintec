# Backend Optimization Rollout Plan

## Current Technical Controls

- `BACKEND_REQUEST_MEMO`: default `on`; set to `false` or `0` to disable request-scoped ownership memoization without reverting code.
- `BACKEND_SHARED_READ_CACHE`: default `off`; set to `true` or `1` to enable shared Redis-backed reads for the safe cached paths already wired.
- `BACKEND_SCRAPER_THROTTLE`: default `off`; set to `true` or `1` to move the background scraper from a 60-second loop to a 5-minute minimum interval.
- `BACKEND_UNIFIED_SCRAPER`: default `on`; set to `false` or `0` to block new unified background-scraper startups by environment.

## Control Surface

- `BACKEND_REQUEST_MEMO`: instant on the next request. It only changes per-request ownership memoization and does not require process restart.
- `BACKEND_SHARED_READ_CACHE`: instant on the next request. It only changes the shared Redis-backed read-through paths already wired in repositories.
- `BACKEND_SCRAPER_THROTTLE`: not instant for an already-running scraper instance because the interval is fixed when the manager starts. Toggle it, then restart the background scraper to apply the new cadence.
- `BACKEND_UNIFIED_SCRAPER`: blocks future unified scraper starts immediately. If a scraper instance is already running, use `POST /api/background-scraper/stop` for the live kill switch and keep the flag off to prevent restart.

## Current Gaps

- No traffic-percentage router exists in-app today, so `5%`, `25%`, and `100%` rollout steps must be done by deployment scope or hosting controls, not by request sampling inside the codebase.
- `BACKEND_PROJECTIONS` is still a design-level rollout control only. The projection changes are already the default code path and do not yet have a dedicated kill switch.
- Database optimization migrations are not yet verified as applied everywhere, so DB rollout must remain migration-first with app flags off until that evidence exists.

## Safe Rollout Order

1. Apply database migrations by environment with all app-level flags in their safest state:
   `BACKEND_SHARED_READ_CACHE=false`, `BACKEND_SCRAPER_THROTTLE=false`.
2. Verify functional gates:
   `npm test`, `npm run test:ci`, auth-required smoke when the environment supports it.
3. Enable `BACKEND_REQUEST_MEMO` only if it had been disabled for recovery; otherwise leave it on and monitor for ownership-scope anomalies.
4. Enable `BACKEND_SHARED_READ_CACHE=true` in the smallest environment slice available and compare cache-hit metrics, latency, and error rate against the wave 0 baseline.
5. Enable `BACKEND_SCRAPER_THROTTLE=true` only after confirming rates freshness monitoring is active and historical writes can tolerate the lower write cadence.
6. Keep `BACKEND_UNIFIED_SCRAPER=true` only while the unified background loop is the intended production mode. For rollback, stop the running instance first, then keep the flag off.

## Rollback Gates

- Disable `BACKEND_SHARED_READ_CACHE` immediately on stale-read, cache-key, or Redis-availability incidents.
- Disable `BACKEND_SCRAPER_THROTTLE` immediately if freshness SLA, rate history expectations, or realtime UX regresses.
- Disable `BACKEND_REQUEST_MEMO` immediately if ownership-scope isolation or request-boundary regressions appear.
- Stop the active background loop via `POST /api/background-scraper/stop` and set `BACKEND_UNIFIED_SCRAPER=false` if the unified scraper itself must be rolled back operationally.
- If DB planner or write regression persists after app flags are off, stop rollout and use a compensating migration rather than code rollback alone.

## Evidence Required Before Wider Rollout

- Baseline and post-change latency comparison for prioritized endpoints.
- Query-count or DB-work evidence for request memo and DB-wave behavior.
- Cache-hit and cache-miss evidence for shared read cache paths.
- Freshness and write-frequency evidence for scraper throttle behavior.
- Auth-required verification proving no cross-user leakage.
