# Proposal: Exclude Test Users and Add Feature Usage Metrics

## Intent

Admin analytics must be honest about real customer activity and useful for product decisions. Shared test, evaluation, and fixture accounts currently risk inflating registered-user, activity, resource, usage, and per-user metrics. At the same time, the dashboard does not show a clear, explainable view of which existing product features are being used most, and administrators are harder to discover from the main application navigation.

This change makes the existing `/admin` dashboard a trustworthy operational and product-usage view by excluding configured test users from every metric, adding an aggregate-only feature-usage leaderboard from existing data, and exposing an admin-only navigation entry. It also supplies a separate, one-time audited local cleanup script; deletion is deliberately not a dashboard capability.

## Scope

### In scope

1. **Centralized test-user matching and analytics exclusion**
   - Add one server-side matcher module, preferably `lib/admin/test-users.ts`, that owns safe default email patterns and parsing of `TEST_USER_EMAIL_PATTERNS`.
   - Match emails case-insensitively using a deliberately small glob-like syntax. `%` and `*` may represent wildcard portions that are translated to simple contains/suffix matchers; patterns must not become arbitrary regular expressions.
   - Use explicit safe defaults for identities established by repository evidence, such as `test@fintec.com` and `eval-fixture-*@fintec.local`. Do not infer production test users from broad `@example.com`, `test@`, display names, or fixture resource names.
   - When the environment variable is present, its comma-separated patterns replace the defaults. Empty, malformed, or unsupported configuration logs a warning and falls back to the safe defaults; it never broadens the exclusion set silently.
   - Resolve matching profile IDs from `public.users` at the admin-stats service boundary, then exclude those IDs consistently from registered-user totals, new-user/activity windows, resource totals, usage rows, and all per-user summaries. Transaction ownership continues to be resolved through accounts before exclusion.
   - Keep the matcher and exclusion-set construction reusable by the cleanup script where practical, while keeping service-role access and deletion orchestration in the script/maintenance layer.

2. **Feature-usage aggregate and dashboard section**
   - Extend the existing admin stats service/DTO and `/admin` dashboard rather than adding a parallel analytics stack or endpoint family.
   - Add a `Uso por funcionalidad` section using a horizontal Recharts bar chart and the existing `AdminStatsCharts`/`glass-card` presentation patterns.
   - Build the leaderboard from existing rows only:
     - transactions created, using `created_at` (or the existing timestamp field confirmed by the service contract);
     - budgets and goals created when their `created_at` fields are available;
     - feedbacks submitted;
     - AI conversation sessions/messages from the existing AI tables and their timestamps;
     - `usage_tracking` monthly counters (`transaction_count`, `backup_count`, `api_calls`, `export_count`, and `ai_requests`) surfaced as stored, supplemental counters.
   - Apply the selected window to sources with usable timestamps. Monthly `usage_tracking` counters remain month-based and are shown independently of the selected timestamp window, with their provenance and limitations visible in the DTO/UI.
   - Preserve explicit unavailable/empty states for optional or missing sources; never turn a failed query or absent timestamp into a fabricated zero. Label the leaderboard as aggregate activity from existing records, not complete event telemetry.
   - Continue returning aggregate DTOs only. Existing per-user summaries, if retained, must use the same excluded-ID set and must not expose email, names, auth metadata, or raw rows.

3. **One-time audited local deletion script**
   - Add a maintenance script following repository conventions, such as `scripts/admin/delete-test-users.ts`.
   - Phase 1 is the default dry run. It inventories matched Auth users through the Supabase Auth Admin API and prints each user's `id`, `email`, `created_at`, and dependent-row counts for the relevant profile-owned tables. It performs no deletion.
   - Phase 2 requires `--confirm` and uses `SUPABASE_SERVICE_ROLE_KEY` from the environment to call `supabase.auth.admin.deleteUser()`. Before execution, the script prints the final target count and requires either typing the exact count as a confirmation token or supplying `--yes` for an explicitly non-interactive confirmation. A missing or changed target set aborts the operation.
   - Respect the discovered foreign-key ordering: verify/count rows, delete the `public.users` profile first where required, then delete the Auth user so profile-owned rows cascade according to the current schema. Read back both profile and Auth absence after each deletion or report the failure without claiming success.
   - Refuse configured `ADMIN_USER_IDS` targets as an additional safety guard and require service-role credentials only in this local operator workflow. The script intentionally targets the hosted database; `NODE_ENV=production` is not used as a bypass or blanket prohibition.
   - Write an audit JSON file containing execution metadata and deleted Auth IDs (not secrets). The output path and filename follow existing script conventions and are suitable for retaining with the maintenance record. There is no dashboard delete button and no recurring automatic deletion job.

4. **Admin navigation discoverability**
   - Add an `Admin` entry to the main application sidebar/navigation.
   - Make visibility server-side and admin-only by reusing the existing `getAdminAccess()`/admin guard seam appropriate to how the navigation is rendered. If the sidebar is client-rendered, use a small server-derived access value or existing access API rather than duplicating the authorization policy in client code.
   - Keep the API and `/admin` page independently guarded; hiding a link is not a security boundary.

5. **Tests and validation seams**
   - Extend admin-stats service/aggregate tests for case-insensitive matching, default and environment patterns, malformed-config fallback, and exclusion from users, activity, resources, usage, transactions, and per-user results.
   - Add usage aggregation tests for timestamp windows, optional missing fields/families, AI/session sources, and independent monthly counters.
   - Add script tests with mocked Auth Admin/database clients covering dry-run behavior, confirmation requirements, deletion ordering, admin-target protection, audit output, and readback failures.
   - Add the smallest navigation/access coverage matching the existing sidebar architecture, while preserving existing admin route and API authorization tests.

### Out of scope / non-goals

- No new event-tracking or instrumentation infrastructure; no new behavioral events are emitted.
- No dashboard delete button, bulk-management UI, recurring cleanup job, or automatic production deletion.
- No RLS policy edits, auth-policy changes, or user-facing account workflow changes.
- No migrations, indexes, RPCs, materialized views, or other DDL unless FK analysis during implementation proves a schema fix is unavoidable; the preferred release is zero-DDL.
- No broad email-regex deletion policy and no inference from names, fixture data, or arbitrary test literals.
- No claim that the leaderboard represents every feature interaction; it covers the documented existing data sources only.
- No changes to payment-order behavior, mobile navigation, or non-admin navigation visibility.

## Affected Areas and Estimated Impact

Estimated tracked impact: approximately 12–18 files, depending on the current branch's existing admin-stats and navigation seams.

| Area | Expected change |
| --- | --- |
| `lib/admin/test-users.ts` | New centralized pattern defaults, parser, matcher, and excluded-ID resolution contract. |
| `lib/admin-stats/types.ts`, `aggregates.ts`, `service.ts` | Extend the existing DTO/service layering for exclusion and feature-usage aggregates; avoid direct database queries in UI. |
| `components/admin/admin-stats-dashboard.tsx` and `admin-stats-charts.tsx` | Render the `Uso por funcionalidad` section with horizontal bars, provenance, empty, and unavailable states. |
| Existing sidebar/navigation component(s) | Add the server-gated `Admin` entry using the existing access seam; exact file depends on the current render boundary. |
| `scripts/admin/delete-test-users.ts` | New local-only dry-run, confirmed deletion, dependency count, verification, and audit-log workflow. |
| `tests/node/lib/*`, `tests/node/api/*`, script/navigation tests | Cover matching, exclusion, aggregation, deletion safety, and access behavior. |
| Environment/deployment documentation if needed | Document optional `TEST_USER_EMAIL_PATTERNS` and the existing `ADMIN_USER_IDS`; do not commit secrets. |

No database schema change is planned. Existing `last_activity_at` behavior remains unchanged; activity metrics must continue to disclose that it is a session-refresh proxy if used.

## Design Principles and Key Decisions

- **One exclusion set, one boundary:** email matching is configuration logic, but all downstream analytics operate on resolved user IDs. This prevents individual resource families or future reducers from forgetting the filter.
- **Fail closed on bad configuration:** a malformed override warns and uses the narrow reviewed defaults. It never treats a malformed value as “match all” or as an empty exclusion list.
- **Existing data only:** the feature leaderboard is a transparent aggregation of rows already persisted. Counters are shown as-is, especially because current `usage_tracking` writers are incomplete/no-op in parts of the codebase.
- **Service-layer reuse:** extend the existing admin stats service, pure reducers, DTOs, chart wrapper, and guard instead of duplicating Supabase clients, aggregation logic, or admin policy.
- **Deletion is separate from analytics:** a local maintenance script is easier to review, audit, dry-run, and remove than a privileged dashboard control. Deletion remains irreversible even when the script verifies its work.
- **Server-side navigation authorization:** the sidebar may optimize presentation, but route/API guards remain mandatory and authoritative.

## Deployment Note

`TEST_USER_EMAIL_PATTERNS` is optional. If omitted, the centralized safe defaults are used. If supplied, it is a comma-separated pattern list; operators should review the dry-run output before any deletion. No Vercel changes are required beyond the existing `ADMIN_USER_IDS` configuration for dashboard access. `SUPABASE_SERVICE_ROLE_KEY` is required only for the locally run maintenance script and must not be exposed to browser code or committed configuration.

Before any deletion run, operators should:

1. use the dry-run against the intended hosted project;
2. review every matched ID/email and dependent-row count;
3. confirm the target count and that no administrator is included;
4. retain the generated inventory/audit output; and
5. run the confirmed phase only after the review is approved.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| An email pattern matches a real customer | High | Keep defaults explicit and narrow, use case-insensitive simple matching rather than broad regexes, warn/fallback on malformed config, and require review of every dry-run target before deletion. Analytics exclusion can be corrected by config; deletion is not reversible. |
| Test users still contaminate one metric family | High | Resolve one excluded-ID set before all reads/reducers and assert exclusion across users, activity, resources, usage, transactions, and per-user data. |
| `last_activity_at` is sparse or trigger population differs in hosted data | Medium/High | Preserve the existing session-refresh interpretation, label the limitation, represent empty/stale data honestly, and do not add instrumentation in this change. |
| Existing usage counters are partial or semantically inconsistent | Medium | Surface monthly counters as-is with provenance, keep them independent of timestamp windows, and do not present them as complete event telemetry. |
| Auth deletion leaves profiles or dependent rows behind | High | Dry-run row counts, follow the known profile-before-Auth ordering, protect admins, verify absence after each deletion, and record failures in the audit output. |
| Confirmation is bypassed accidentally | High | Require `--confirm`, exact-count typed confirmation or explicit `--yes`, re-read the target set before execution, and never delete during the default dry run. |
| Service-role credentials or PII leak through the dashboard/script | High | Keep service-role code server/local only, return aggregate DTOs, omit secrets from logs, and limit audit output to operational metadata and IDs. |
| Added queries slow the admin page | Medium | Reuse the one aggregate request/service, keep projections and windows bounded, parallelize independent reads where safe, and defer DDL/RPC optimization until measured need. |

## Rollback Plan

- Revert the dashboard/service/UI/navigation/test commits to remove the new leaderboard and navigation entry. Existing admin stats can continue to operate without the new section if the implementation keeps the DTO extension backward-compatible.
- Remove or revert the local deletion script without running it; no schema rollback is needed.
- Restore the prior `TEST_USER_EMAIL_PATTERNS` configuration or unset it to return to the reviewed defaults. Analytics exclusion changes are reversible through code/configuration.
- Auth/profile deletion is **irreversible** through this application change. Git rollback, environment rollback, or script removal cannot restore deleted Auth users or cascaded financial/AI/history rows; restoration would require an independent database/backup recovery process.

## Success Criteria

- [ ] The admin stats service resolves case-insensitive test-user email matches from centralized defaults or `TEST_USER_EMAIL_PATTERNS`, warns and falls back safely for malformed overrides, and excludes the resulting IDs from every metric family, including users, activity, resources, usage, and per-user summaries.
- [ ] The dashboard contains `Uso por funcionalidad` with an accessible horizontal bar chart using existing Recharts/glass-card patterns and clearly identifies its existing-data provenance.
- [ ] Timestamp-backed feature sources respect the selected window; monthly `usage_tracking` counters remain independent and are surfaced as stored supplemental data.
- [ ] Missing/optional timestamp sources and query failures produce explicit unavailable/empty states rather than fabricated zeroes or misleading rankings.
- [ ] The default deletion script only performs a dry-run and lists each matched Auth user with ID, email, creation time, and dependent-table row counts.
- [ ] Deletion cannot execute without `--confirm` plus exact-count confirmation or `--yes`, uses the service-role key only locally, protects admins, follows safe FK ordering, verifies readback, and writes an audit JSON record of deleted IDs.
- [ ] The main navigation shows `Admin` only for administrators through server-side access gating, while `/admin` and its API remain independently protected.
- [ ] No instrumentation, dashboard deletion control, RLS edit, or migration is introduced, and existing admin/payment-order behavior remains unchanged.
- [ ] Relevant Jest, type-check, lint, formatting, and repository verification pass.

## Proposal Question Round

These questions are intended to improve the PRD/proposal by uncovering business rules, implications, edge cases, and product tradeoffs. The binding decisions above are treated as settled; the assumptions below remain reviewable. The user may answer, skip, correct the framing, or request a second question round.

1. **Default pattern review:** Should the first release's defaults be limited exactly to `test@fintec.com` and `eval-fixture-*@fintec.local`, with every other pattern supplied explicitly through `TEST_USER_EMAIL_PATTERNS`? Assumption: yes; broad `@example` and `test@` patterns stay excluded.
2. **Leaderboard interpretation:** Should monthly counters appear as separate bars from timestamp-backed feature actions, or as a clearly labeled supplemental group in the same section? Assumption: one section with provenance-labeled groups so counters are not mistaken for event counts.
3. **Per-user operational follow-up:** Is the existing opaque-ID per-user summary sufficient after exclusion, or does the admin workflow require an approved non-PII label? Assumption: retain aggregate opaque IDs only and do not add email/name exposure.
4. **Deletion approval record:** Should the audit JSON include an operator-provided ticket/change identifier in addition to timestamps, target IDs, and counts? Assumption: include optional operator metadata if repository conventions support it, without recording secrets.
5. **Activity trust:** Is session-refresh activity acceptable for the existing active-user metrics if the dashboard labels the limitation and the release verifies hosted data population? Assumption: yes; request-level activity instrumentation remains a non-goal.
