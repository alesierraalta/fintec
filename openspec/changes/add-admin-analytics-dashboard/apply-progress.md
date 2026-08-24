# Apply Progress: add-admin-analytics-dashboard

## Status consumed

- `schemaName`: `spec-driven`
- `changeName`: `add-admin-analytics-dashboard`
- `artifactStore`: `openspec` (authoritative native status)
- `applyState`: `ready` at start; implementation-owned work is now partially complete.
- `actionContext`: `repo-local`; workspace `/home/alesierraalta/documents/projects/fintec-worktrees/admin-dashboard`; edits stayed within the workspace root.
- Delivery boundary: approved stacked-to-main chain. PR1 covers tasks 1–4; PR2 covers tasks 5–7. Both were implemented on this branch without commits.
- CodeGraph MCP was unavailable (`MCP not initialized`); structural exploration fell back to targeted repository reads after the required availability check.

## Completed implementation tasks and persisted checkboxes

- Tasks 1.1–1.3: installed `@vercel/analytics` and `@vercel/speed-insights`, mounted each once in `app/layout.tsx`, and type-checked the integration. Persisted as `[x]`.
- Tasks 2.1–2.4: added strict fail-closed shared admin guard and focused tests. Persisted as `[x]`.
- Tasks 3.1–3.5: added typed DTOs, pure UTC/activity/resource reducers, lazy service-role aggregate service, and fixture-driven tests. Persisted as `[x]`.
- Tasks 4.1–4.4: added independently guarded aggregate route with bounded windows, standard envelopes, safe errors, and `Cache-Control: no-store`. Persisted as `[x]`.
- Tasks 5.1–5.5: added server-guarded `/admin`, denied state, client dashboard, Recharts chart, loading/error/empty states, and page tests. Persisted as `[x]`.
- Tasks 7.1–7.2: focused Node suite and type-check completed. Persisted as `[x]`.

## TDD Cycle Evidence

| Cycle | RED | GREEN | TRIANGULATE / REFACTOR |
|---|---|---|---|
| Admin guard | `npm test -- --selectProjects node --runInBand tests/node/lib/admin-guard.test.ts` failed because `lib/admin/guard.ts` was absent; initial attempt also exposed missing installed dependencies (`cross-env`). | Implemented `lib/admin/guard.ts`; focused guard suite passed: 4 tests. | Confirmed auth precedes `isAdmin`, auth errors propagate, non-admin maps to `FORBIDDEN`/403, and no service client is imported. |
| Stats service | `npm test -- --selectProjects node --runInBand tests/node/lib/admin-stats-service.test.ts` failed because service module was absent. | Implemented types, reducers, and service; suite passed: 2 tests. | Confirmed UTC buckets, distinct activity, empty activity, nullable account ownership, account total inclusion, per-user merges, monthly counters, aggregate-only DTO. |
| Stats API | `npm test -- --selectProjects node --runInBand tests/node/api/admin-stats-route.test.ts` failed because route was absent. | Implemented route; after correcting plain `Request` URL access, route suite passed. | Confirmed 401/403/400/500 envelope behavior, service non-invocation on denial/validation, and `no-store` on all responses. |
| Admin page/UI | `npm test -- --runInBand tests/app/admin/page.test.tsx` failed because UI modules were absent. | Implemented page and components; page suite passed: 3 tests. | Confirmed auth redirect, denied state, authorized dashboard mount, shared loading/stat primitives, honest fetch error and empty-activity states by implementation inspection. |

## Files changed

- `package.json`, `package-lock.json`
- `app/layout.tsx`
- `lib/admin/guard.ts`
- `lib/admin-stats/types.ts`, `aggregates.ts`, `service.ts`
- `app/api/admin/stats/route.ts`
- `app/admin/page.tsx`
- `components/admin/admin-access-denied.tsx`, `admin-stats-dashboard.tsx`, `admin-stats-charts.tsx`
- `tests/node/lib/admin-guard.test.ts`, `tests/node/lib/admin-stats-service.test.ts`, `tests/node/api/admin-stats-route.test.ts`
- `tests/app/admin/page.test.tsx`
- This `apply-progress.md` and persisted task checkboxes in `tasks.md`.

## Verification evidence

- `npm test -- --selectProjects node --runInBand tests/node/lib/admin-guard.test.ts tests/node/lib/admin-stats-service.test.ts tests/node/api/admin-stats-route.test.ts` — PASS, 3 suites / 13 tests.
- `npm test -- --runInBand tests/app/admin/page.test.tsx` — PASS, 1 suite / 3 tests.
- `npm run type-check` — PASS.
- `npm run lint` — PASS with 345 pre-existing warnings, 0 errors.
- `npm run guard:db-access` — PASS.
- `npm run test:ci` — 255 suites passed, 1 unrelated existing DB suite failed: `tests/db/rls-cross-user.test.ts` received Supabase `PGRST303 JWT issued at future`; no changed-file test failed. This is reported honestly and not weakened.

## Deviations

- Local/dev live-database and deployment evidence tasks 6.1–6.3 were not run because no credentials or deployment session were provided; no `.env*`, scripts, fixtures, or credentials were added.
- `npm run prepush:verify` was not run after the full Jest gate exposed the unrelated external DB failure; task 7.3 remains unchecked.
- No schema, migration, RLS, payment-order, or environment files were changed.

## Remaining implementation tasks

- [ ] **6.1.** Local authenticated admin/non-admin/unauthenticated `/admin` verification (local-only evidence).
- [ ] **6.2.** Local API window/status/DTO/null-account/empty-activity verification (local-only evidence).
- [ ] **6.3.** Local two-second timing and Vercel environment/integration deployment confirmation (local-only evidence).
- [ ] **7.3.** Run `npm run prepush:verify` and complete final repository-gate confirmation; currently blocked by the unrelated full-suite DB failure above.

## Deferred parent lifecycle actions

- [ ] **7.4.** Parent starts/reuses bounded review and reports receipt/evidence.
- [ ] **7.5.** Parent manages the stacked PR chain/budget decision.

## Next recommendation

`parent-lifecycle` after the parent decides whether to perform the local-only evidence tasks and handles the known unrelated DB test failure. `sdd-apply` did not start review, create receipts, or validate delivery gates.
