# Implementation Tasks: Exclude Test Users and Add Feature Usage Metrics

Strict TDD applies to implementation groups: **RED → GREEN → TRIANGULATE → REFACTOR**. The Jest node lane is the default verification lane for server, reducer, route, and script work; the Jest DOM lane is used for React components. `[REPO-COMMITTED]` means the change belongs in the PR. `[LOCAL-ONLY]` means it must run only against the intended hosted project and its output must not be committed.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,130–1,490 total across four implementation PR boundaries; no committed lines for the hosted dry-run |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4; local validation remains outside the chain |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

The split keeps each proposed PR near or below the 400-line review budget, but the total change is well above it. The parent should choose the chain strategy before apply begins.

## 1. Centralized test-user matcher

**PR boundary:** PR 1, together with Group 2. **Committed paths:** `lib/admin/test-users.ts`, `tests/node/lib/admin-stats-service.test.ts`.

### RED

- [x] 1.1. [REPO-COMMITTED][RED] Add isolated matcher cases to `tests/node/lib/admin-stats-service.test.ts` for the two reviewed defaults, case-insensitive whole-email matching, `*` and `%` wildcard edge cases, null/empty emails, and literal regex characters; assert that input is never interpreted as arbitrary regular expression syntax. <!-- sdd-owner: implementation -->

- [x] 1.2. [REPO-COMMITTED][RED] Add environment-parser cases in `tests/node/lib/admin-stats-service.test.ts` for absent configuration, valid replacement patterns, empty entries, unsupported syntax, overlong values, warning behavior, and fallback to the narrow defaults without logging emails or secrets. <!-- sdd-owner: implementation -->

### GREEN

- [x] 1.3. [REPO-COMMITTED][GREEN] Implement `DEFAULT_TEST_USER_EMAIL_PATTERNS`, `getTestUserPatterns()`, `isTestUserEmail(email)`, and the bounded parser/compiler in `lib/admin/test-users.ts`; accept only email-safe literals plus `*`/`%`, anchor the match to the complete email, and fail closed to defaults with one safe warning. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 1.4. [REPO-COMMITTED][TRIANGULATE] Run `npx jest --selectProjects node tests/node/lib/admin-stats-service.test.ts --runInBand` and verify matcher tests pass with `TEST_USER_EMAIL_PATTERNS` restored after each case; confirm warning assertions contain no user data. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 1.5. [REPO-COMMITTED][REFACTOR] Keep matching framework-free and reusable by the service and maintenance script, remove duplicated parsing logic in the test fixture setup if introduced, and run `npx prettier --check lib/admin/test-users.ts tests/node/lib/admin-stats-service.test.ts`. <!-- sdd-owner: implementation -->

## 2. Admin-stats exclusion wiring

**PR boundary:** PR 1. **Committed paths:** `lib/admin-stats/service.ts`, `tests/node/lib/admin-stats-service.test.ts`.

### RED

- [x] 2.1. [REPO-COMMITTED][RED] Extend fixtures in `tests/node/lib/admin-stats-service.test.ts` with mixed-case canonical/eval emails, valid override-only matches, non-matching real users, excluded and included account owners, null ownership, every existing resource family, monthly usage rows, and per-user expectations; assert excluded IDs disappear from users, activity, resources, transactions, usage, and per-user results. <!-- sdd-owner: implementation -->

- [x] 2.2. [REPO-COMMITTED][RED] Add service-level assertions in `tests/node/lib/admin-stats-service.test.ts` that transaction ownership is resolved through accounts before filtering, excluded accounts cannot create an anonymous bucket, malformed configuration does not fail the request, and no returned aggregate contains email/name fields. <!-- sdd-owner: implementation -->

### GREEN

- [x] 2.3. [REPO-COMMITTED][GREEN] Update `lib/admin-stats/service.ts` to select the required user email/timestamp fields, resolve one excluded-user ID set through `isTestUserEmail`, and filter user-owned rows before calling existing reducers; preserve null-owner aggregate behavior while excluding excluded owners from grouped and per-user output. <!-- sdd-owner: implementation -->

- [x] 2.4. [REPO-COMMITTED][GREEN] In `lib/admin-stats/service.ts`, build the account-to-included-owner map before transaction attribution and pass the same included source rows to resource, activity, new-user, monthly-usage, and future feature reducers without adding query-level filter drift or exposing email data. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 2.5. [REPO-COMMITTED][TRIANGULATE] Run `npx jest --selectProjects node tests/node/lib/admin-stats-service.test.ts --runInBand` and inspect the returned DTO shape for exclusion across every fixture family; run `npm run type-check -- --pretty false` if the repository script accepts the forwarded option, otherwise run `npm run type-check`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 2.6. [REPO-COMMITTED][REFACTOR] Consolidate included/excluded row filtering at the service boundary in `lib/admin-stats/service.ts`, retain existing optional-family degradation, and run `npx prettier --check lib/admin-stats/service.ts tests/node/lib/admin-stats-service.test.ts`. <!-- sdd-owner: implementation -->

## 3. Feature-usage reducers and DTO extension

**PR boundary:** PR 2, together with Group 4. **Committed paths:** `lib/admin-stats/feature-usage.ts`, `lib/admin-stats/types.ts`, `lib/admin-stats/service.ts`, `tests/node/lib/feature-usage.test.ts`.

### RED

- [x] 3.1. [REPO-COMMITTED][RED] Create `tests/node/lib/feature-usage.test.ts` with failing reducer tests for `transactions_created`, `budgets_created`, `goals_created`, `feedbacks_submitted`, `ai_sessions`, and `ai_messages`, including UTC window boundaries, excluded rows, and source timestamps. <!-- sdd-owner: implementation -->

- [x] 3.2. [REPO-COMMITTED][RED] Add failing `tests/node/lib/feature-usage.test.ts` cases for transaction `byDay`, feedback trailing-seven-day `recentCount`, null/unusable timestamps, unavailable versus empty source states, partial results, and monthly `usage_tracking` counters independent of the selected window. <!-- sdd-owner: implementation -->

### GREEN

- [x] 3.3. [REPO-COMMITTED][GREEN] Implement pure, framework-free reducers and DTO builders in `lib/admin-stats/feature-usage.ts`; emit stable keys, selected-window basis, honest `available`/`empty`/`partial`/`unavailable` states, UTC counts, transaction daily buckets, and safe reasons without raw rows or PII. <!-- sdd-owner: implementation -->

- [x] 3.4. [REPO-COMMITTED][GREEN] Extend `lib/admin-stats/types.ts` with `FeatureUsageStatus`, item types, monthly-counter types, and `AdminStats.featureUsage`; wire `lib/admin-stats/service.ts` to read the documented optional AI families, preserve query failures as unavailable, and pass already-filtered rows plus the selected window to the reducer. <!-- sdd-owner: implementation -->

- [x] 3.5. [REPO-COMMITTED][GREEN] In `lib/admin-stats/feature-usage.ts` and `lib/admin-stats/service.ts`, keep `usage_tracking` month-based and provenance-labeled, omit fabricated zeroes for missing timestamps/query failures, and preserve the existing `usage.byMonth` exclusion contract. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 3.6. [REPO-COMMITTED][TRIANGULATE] Run `npx jest --selectProjects node tests/node/lib/feature-usage.test.ts tests/node/lib/admin-stats-service.test.ts --runInBand`; then run `npm run type-check` and verify all six supported keys and the monthly-counter envelope are present without user identifiers. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 3.7. [REPO-COMMITTED][REFACTOR] Keep `lib/admin-stats/feature-usage.ts` independent of Supabase and logging, centralize status construction, and run `npx prettier --check lib/admin-stats/feature-usage.ts lib/admin-stats/types.ts lib/admin-stats/service.ts tests/node/lib/feature-usage.test.ts`. <!-- sdd-owner: implementation -->

## 4. Admin route DTO assertions

**PR boundary:** PR 2. **Committed path:** `tests/node/api/admin-stats-route.test.ts`. The route implementation at `app/api/admin/stats/route.ts` remains independently guarded and otherwise unchanged.

### RED

- [x] 4.1. [REPO-COMMITTED][RED] Add a failing DTO assertion in `tests/node/api/admin-stats-route.test.ts` requiring `featureUsage.status`, `featureUsage.window`, `featureUsage.items`, and `featureUsage.monthlyCounters`, while retaining the existing auth-before-window-validation assertion. <!-- sdd-owner: implementation -->

### GREEN

- [x] 4.2. [REPO-COMMITTED][GREEN] Update the mocked successful stats DTO and assertions in `tests/node/api/admin-stats-route.test.ts` to cover the new aggregate section; do not add an exclusion or feature parameter to `app/api/admin/stats/route.ts`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 4.3. [REPO-COMMITTED][TRIANGULATE] Run `npx jest --selectProjects node tests/node/api/admin-stats-route.test.ts --runInBand` and verify unauthorized, invalid-window, safe-error, `Cache-Control: no-store`, and feature-usage DTO assertions all remain green. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 4.4. [REPO-COMMITTED][REFACTOR] Keep route assertions focused on the public DTO envelope rather than reducer internals, and run `npx prettier --check tests/node/api/admin-stats-route.test.ts`. <!-- sdd-owner: implementation -->

## 5. Feature-usage dashboard UI

**PR boundary:** PR 3, together with Group 6. **Committed paths:** `components/admin/admin-feature-usage.tsx`, `components/admin/admin-stats-charts.tsx`, `components/admin/admin-stats-dashboard.tsx`, `tests/components/admin-feature-usage.test.tsx`.

### RED

- [x] 5.1. [REPO-COMMITTED][RED] Add `tests/components/admin-feature-usage.test.tsx` with failing DOM tests for the `Uso por funcionalidad` heading, accessible horizontal bar-chart/table presentation, source provenance, and the explicit statement that values are aggregate existing-record activity rather than complete telemetry. <!-- sdd-owner: implementation -->

- [x] 5.2. [REPO-COMMITTED][RED] Extend `tests/components/admin-feature-usage.test.tsx` with available, empty, partial, and unavailable item fixtures; assert empty/unavailable families are visibly labeled and are not plotted as fabricated zero bars. <!-- sdd-owner: implementation -->

### GREEN

- [x] 5.3. [REPO-COMMITTED][GREEN] Implement `components/admin/admin-feature-usage.tsx` as the client-side Recharts feature section using the existing `glass-card rounded-3xl p-6` treatment, vertical-layout horizontal bars, accessible labels, provenance text, and a compact text/table fallback. <!-- sdd-owner: implementation -->

- [x] 5.4. [REPO-COMMITTED][GREEN] Extend `components/admin/admin-stats-charts.tsx` and `components/admin/admin-stats-dashboard.tsx` to render the feature-usage section beside the existing admin charts, loading state, and unavailable/error handling without adding a parallel endpoint or deletion control. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 5.5. [REPO-COMMITTED][TRIANGULATE] Run `npx jest --selectProjects dom tests/components/admin-feature-usage.test.tsx --runInBand`, then `npm run type-check`; verify chart accessibility, no zero plotting for unavailable data, and unchanged existing dashboard rendering. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 5.6. [REPO-COMMITTED][REFACTOR] Keep labels and provenance explicit in `components/admin/admin-feature-usage.tsx`, reuse existing chart/card styling from `components/admin/admin-stats-charts.tsx`, and run `npx prettier --check components/admin/admin-feature-usage.tsx components/admin/admin-stats-charts.tsx components/admin/admin-stats-dashboard.tsx tests/components/admin-feature-usage.test.tsx`. <!-- sdd-owner: implementation -->

## 6. Server-gated Admin navigation

**PR boundary:** PR 3. **Committed paths:** `contexts/admin-access-context.tsx`, `lib/admin/guard.ts`, `app/layout.tsx`, `app/route-aware-providers.tsx`, `components/layout/sidebar.tsx`, `tests/components/admin-sidebar.test.tsx`.

### RED

- [x] 6.1. [REPO-COMMITTED][RED] Add failing cases to `tests/components/admin-sidebar.test.tsx` for server-derived admin access, non-admin access, and unauthenticated/false access; assert exactly one `/admin` link for an administrator and none for other cases, including before hydration. <!-- sdd-owner: implementation -->

- [x] 6.2. [REPO-COMMITTED][RED] Add a layout/provider assertion in `tests/components/admin-sidebar.test.tsx` that the access value is supplied without a client auth lookup or loading state, while the existing guarded `/admin` page and stats API remain the security boundary. <!-- sdd-owner: implementation -->

### GREEN

- [x] 6.3. [REPO-COMMITTED][GREEN] Implement `getAdminVisibility()` in `lib/admin/guard.ts` as a fail-closed soft wrapper around `getAdminAccess()`, then add the boolean-only provider in `contexts/admin-access-context.tsx`. <!-- sdd-owner: implementation -->

- [x] 6.4. [REPO-COMMITTED][GREEN] Make `app/layout.tsx` obtain server-side visibility and pass it through `app/route-aware-providers.tsx`; update `components/layout/sidebar.tsx` to render one `Admin` `/admin` entry from context, without changing `components/layout/mobile-nav.tsx`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 6.5. [REPO-COMMITTED][TRIANGULATE] Run `npx jest --selectProjects dom tests/components/admin-sidebar.test.tsx --runInBand`, the existing node admin guard/route suites including `tests/node/api/admin-stats-route.test.ts`, and `npm run type-check`; verify no client-side admin flash path exists. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 6.6. [REPO-COMMITTED][REFACTOR] Keep authorization policy in `lib/admin/guard.ts`, keep presentation state limited to the server-derived boolean, preserve existing sidebar pathname behavior, and run `npx prettier --check contexts/admin-access-context.tsx lib/admin/guard.ts app/layout.tsx app/route-aware-providers.tsx components/layout/sidebar.tsx tests/components/admin-sidebar.test.tsx`. <!-- sdd-owner: implementation -->

## 7. Audited local deletion script helpers

**PR boundary:** PR 4. **Committed paths:** `scripts/admin/delete-test-users.ts`, `tests/node/scripts/delete-test-users.test.ts`, `.gitignore`. The script is committed code, but every live invocation and generated audit file is local-only.

### RED

- [x] 7.1. [REPO-COMMITTED][RED] Add pure-helper tests in `tests/node/scripts/delete-test-users.test.ts` for matcher delegation to `lib/admin/test-users.ts`, Auth pagination normalization, grouped profile-owned/dependent-row counts including account-to-transaction ownership, and admin-target rejection. <!-- sdd-owner: implementation -->

- [x] 7.2. [REPO-COMMITTED][RED] Add tests in `tests/node/scripts/delete-test-users.test.ts` for exact-count/`--yes` confirmation, target count and sorted-ID reconciliation, audit serialization with emails/secrets redacted, atomic audit writing, and failure outcomes that preserve deleted-so-far IDs. <!-- sdd-owner: implementation -->

### GREEN

- [x] 7.3. [REPO-COMMITTED][GREEN] Implement the pure helpers and local CLI orchestration in `scripts/admin/delete-test-users.ts`: default dry-run inventory, centralized matcher reuse, dependency counts, `--confirm` plus exact count or `--yes`, snapshot re-read/reconciliation, admin protection, profile-before-Auth deletion, readback verification, non-zero failure handling, and audit JSON without secrets. <!-- sdd-owner: implementation -->

- [x] 7.4. [REPO-COMMITTED][GREEN] Add `.local-audit/` to `.gitignore` and ensure `scripts/admin/delete-test-users.ts` requires local `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only for the operator workflow; do not add a dashboard control, recurring job, migration, DDL, or browser import. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 7.5. [REPO-COMMITTED][TRIANGULATE] Run `npx jest --selectProjects node tests/node/scripts/delete-test-users.test.ts --runInBand`, `npm run type-check`, and the repository lint target for `scripts/admin/delete-test-users.ts`; verify tests use mocked rows/clients only and never contact Supabase. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 7.6. [REPO-COMMITTED][REFACTOR] Keep deletion orchestration separate from pure matching/count/reconciliation helpers, preserve atomic audit writes and redaction, and run `npx prettier --check scripts/admin/delete-test-users.ts tests/node/scripts/delete-test-users.test.ts .gitignore`. <!-- sdd-owner: implementation -->

## 8. Local-only hosted validation

This group is intentionally operational rather than a CI test. It must not create committed target inventories, PII evidence, or deletion evidence. The Jest node tests in Group 7 remain the repository verification seam.

### RED

- [ ] 8.1. [LOCAL-ONLY][RED] Prepare a local environment for `scripts/admin/delete-test-users.ts` with the intended hosted `NEXT_PUBLIC_SUPABASE_URL`, service-role credential, reviewed `TEST_USER_EMAIL_PATTERNS`, and `ADMIN_USER_IDS`; confirm the credential is supplied by the process environment and is not written to a file or command transcript. <!-- sdd-owner: implementation -->

### GREEN

- [ ] 8.2. [LOCAL-ONLY][GREEN] Run `tsx scripts/admin/delete-test-users.ts` without `--confirm` against the intended hosted database; verify the dry run lists each matched Auth `id`, `email`, `created_at`, and dependent-row counts, writes only the ignored `.local-audit/delete-test-users-<timestamp>.json`, deletes nothing, and exits non-zero for zero matches or inventory/count failure. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] 8.3. [LOCAL-ONLY][TRIANGULATE] Review the local inventory against the intended operator approval: confirm every target is expected, no `ADMIN_USER_IDS` target is present, counts are plausible, the audit contains no service key or unnecessary PII, and no `--confirm`/`--yes` deletion run is performed as part of this validation task. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] 8.4. [LOCAL-ONLY][REFACTOR] Remove or retain the ignored local audit according to the maintenance record, restore the shell environment safely, and record only sanitized procedural findings in an approved documentation file if requested; never commit `.local-audit/`, target IDs/emails, hosted output, secrets, or deletion evidence. <!-- sdd-owner: implementation -->

## Parent-owned post-apply gates

- [ ] Start or reuse a bounded review at each proposed PR boundary, beginning with PR 1, and stop the chain when review risk or the 400-line budget requires a decision. <!-- sdd-owner: parent -->
- [ ] Decide the pending chain strategy and whether to apply the next PR after reviewing the implementation receipt and local-only validation status. <!-- sdd-owner: parent -->

## Review Workload Forecast — Final Boundary Summary

| Boundary | Groups | Estimated changed lines | Delivery boundary |
|---|---:|---:|---|
| PR 1 | 1–2 | 300–390 | Matcher and complete admin-stats exclusion; verify before feature DTO work |
| PR 2 | 3–4 | 280–380 | Pure feature reducers, DTO/service extension, and route envelope assertions |
| PR 3 | 5–6 | 260–360 | Feature-usage UI plus server-gated desktop/sidebar navigation |
| PR 4 | 7 | 260–360 | Script, pure helper tests, audit ignore rule; no live execution |
| Local-only | 8 | 0 committed | Hosted dry-run only; no evidence committed |
| **Total** | **1–8** | **1,130–1,490** | **Chained delivery recommended; parent decision required before apply** |

Chained PRs recommended: Yes
400-line budget risk: High
Decision needed before apply: Yes
Delivery strategy: ask-on-risk
Chain strategy: pending
