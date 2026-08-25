# Proposal: First-Party Page Visits Analytics

## Intent

FinTec currently has Vercel Web Analytics, but no first-party, admin-visible measure of adoption across the application. Administrators cannot answer how many page views the product receives, how many distinct visitors return on a given day, or when traffic peaks. A small daily page-visits dataset will make adoption trends and operational peaks measurable without adding third-party tracking, cookies, or user-facing identity data.

The confirmed product decisions are fixed: instrument the complete App Router application, store events in Supabase, expose the result in the existing `/admin` surface, and use non-blocking Next.js middleware ingestion.

## Scope

### In Scope

1. **Request registration across the App Router**
   - Extend the existing `middleware.ts` request flow so every eligible App Router page navigation/document request can produce one page-view event, including public, authenticated, and admin pages.
   - Exclude static assets, Next internals, API routes, RSC/data prefetches, and other non-page requests. Strip query strings before storing the route so URLs cannot leak query-parameter data.
   - Keep the existing Supabase session-refresh behavior and reuse its verified session context. Apply `lib/admin/test-users.ts` before insertion without persisting user identity or adding a blocking auth lookup solely for analytics.
   - Apply a bounded, case-insensitive crawler User-Agent filter. Missing User-Agent values are not bots by default.
   - Insert asynchronously after the response is constructed. Use `waitUntil` where the runtime supports it and a caught fire-and-forget fallback otherwise; ingestion errors must never change the navigation response.

2. **Supabase storage and privacy controls**
   - Add a `page_visits` migration with a UUID key, UTC `visited_at`/`visit_date`, normalized route pathname, and a keyed visitor digest. Do not store raw IP addresses, User-Agent strings, cookies, query strings, user IDs, or other PII.
   - Derive `visitor_hash` with a server-side HMAC secret and a UTC-date key so the same source can count once per UTC day without making the digest reversible. Document secret handling and rotation; no secret or raw address may enter logs.
   - Add indexes for UTC date and `(visit_date, visitor_hash)` to support bounded daily aggregation.
   - Enable RLS so anonymous/authenticated clients cannot read or insert events. The only read path is the server-side aggregate service after the existing `ADMIN_USER_IDS` guard; middleware insertion uses the existing server-only Supabase service pattern and is never exposed to client code.

3. **Admin aggregation API**
   - Add a guarded page-visits aggregate endpoint, following existing admin route/error conventions, with a bounded UTC date range and a sensible default (30 days).
   - Return aggregate-only data: contiguous daily page-view and distinct-visitor buckets, totals, and peak day/value(s). Do not return event rows, hashes, routes with identifying query data, or identity fields.
   - Keep aggregation bounded and database-efficient. Use the indexed date/hash columns and database-side aggregation where supported; avoid transferring an unbounded event set to the browser. Empty ranges return explicit zero buckets.
   - Reuse `lib/admin/guard.ts`, `ADMIN_USER_IDS`, `lib/supabase/admin.ts`, and existing response conventions rather than creating another authorization or Supabase access layer.

4. **Admin dashboard section**
   - Add a focused page-visits section to the existing `/admin` dashboard, preserving its current authorization and payment-orders behavior.
   - Support a bounded date-range selector, daily page views and unique visitors, and visible peak indicators in a Recharts temporal chart. Reuse existing `glass-card`, `ResponsiveContainer`, loading, empty, and error presentation primitives.
   - Keep the component aggregate-only and server/API guarded. Do not build a separate analytics shell, route-detail explorer, export, or realtime stream.

5. **Verification seams**
   - Cover the shared request predicate for page navigation, API/static/internal exclusions, bot filtering, test-user exclusion, route normalization, HMAC-only storage, and non-blocking failure behavior.
   - Cover UTC daily bucketing, distinct visitor counts, repeated same-day hashes, empty ranges, peak calculation, date bounds, and admin/non-admin/unauthenticated API access.
   - Add migration/RLS coverage where the repository database test lane is available: client reads/inserts are denied and server-side ingestion plus admin aggregation work as intended.

### Out of Scope

- Third-party tracking, additional Vercel analytics instrumentation, advertising profiles, cookies, localStorage identifiers, or cross-site tracking.
- Raw IP, User-Agent, email, name, auth metadata, user ID, query parameters, or any other PII in the event table or aggregate API.
- User-level analytics, session replay, funnel/cohort analysis, route-level admin breakdowns, realtime updates, exports, alerts, attribution, or historical backfill.
- Changes to existing admin authorization, payment orders, navigation behavior, or Vercel Analytics. Vercel remains available for its existing product-level observability role.
- Counting API requests or background data traffic as page views.

## Architectural Decision and Alternatives

### Chosen: Supabase plus Next.js middleware

This is first-party, covers the complete App Router request boundary, and gives the product control over event definition, bot/test-user exclusions, UTC aggregation, retention, and admin access. Supabase provides durable storage and indexed aggregation, while the existing service-role helper keeps event writes and reads server-only. HMAC IP digests provide a daily uniqueness signal without retaining raw network identifiers. Non-blocking writes preserve navigation reliability.

### Considered alternatives

- **Vercel Analytics only:** already present and useful for vendor observability, but it does not provide this application-specific admin section, the required exclusion rules, Supabase-controlled retention, or the chosen HMAC-based daily unique definition.
- **`localStorage`:** cannot reliably cover server-rendered or first visits, is cleared or blocked, fragments visitors across devices, and introduces client-side identity behavior that is explicitly out of scope.
- **Hybrid browser plus middleware tracking:** increases duplicate-event and reconciliation problems, adds client tracking/privacy surface, and still requires the middleware/Supabase path for complete App Router coverage. It provides no v1 benefit over one authoritative server-side event definition.

## Affected Areas

| Area | Expected change |
| --- | --- |
| `middleware.ts` and the existing middleware Supabase seam | Classify eligible page requests and schedule non-blocking recording. |
| `lib/page-visits/*` | Shared request predicate, HMAC digesting, test-user/bot exclusion, ingestion, DTOs, and aggregation service. |
| `supabase/migrations/*` | `page_visits` table, indexes, RLS, and the narrowly scoped server aggregation/insertion support required by the chosen query path. |
| `app/api/admin/page-visits/route.ts` (or the established admin-stats route boundary) | Date-bounded, independently guarded aggregate API. |
| `app/admin/page.tsx` and `components/admin/*` | Reused admin dashboard section, range controls, Recharts chart, peak and empty/error states. |
| Middleware, service, route, admin, and database tests | Privacy, filtering, aggregation, authorization, and failure-path coverage. |

No parallel admin guard, chart dependency, Supabase client helper, or analytics UI framework should be introduced.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Visitor digest can be re-identifying if implemented or rotated poorly | High | Never persist raw IP; use a server-only HMAC secret with date-scoped derivation, minimize retention, exclude the digest from API responses/logs, and document rotation. |
| Middleware write affects latency or fails in the Edge runtime | High | Construct the response first, use `waitUntil`/caught asynchronous delivery, use a small runtime-compatible writer, bound failures, and monitor latency/error rate. |
| API/RSC requests inflate page views | High | Centralize one document/navigation predicate, exclude API/internal/static/prefetch traffic, normalize pathnames, and test representative Next.js headers. |
| Bots and test users distort adoption | Medium | Use a conservative bounded bot denylist and the existing test-user helper; test both writes and aggregates so excluded events cannot reappear. |
| Event volume makes aggregation or retention expensive | Medium | Store only the minimum event fields, index date/hash, bound the requested range, aggregate in the database, monitor row growth/query duration, and define a retention policy before production scale requires it. |
| Admin data exposure through a client or misconfigured route | High | Deny direct RLS reads/inserts, require `ADMIN_USER_IDS` independently in the API, keep service-role access server-only, and return aggregates only. |

## Rollout Plan

1. Deploy the migration and verify RLS, indexes, the HMAC secret, and the server-only ingestion path in a non-production environment.
2. Enable middleware recording behind a small operational kill switch/configuration. Validate that eligible page navigations create events, bots/test users do not, and raw IP/query data is absent from rows and logs.
3. Release the guarded `/admin` section and aggregate API. Start with a 30-day UTC range; no historical backfill is expected, so the chart begins at enablement.
4. Monitor middleware response-latency delta, asynchronous ingestion failures, aggregate query duration, daily row growth, and empty/abnormal bot ratios. Expand retention or database aggregation only from observed volume.
5. If the feature must be withdrawn, disable recording first, remove the dashboard/API exposure, and retain or remove the table only according to the approved retention/privacy decision.

## Rollback Plan

- Set the recording kill switch off (or remove the middleware scheduling call) without changing page navigation behavior.
- Remove the `/admin` section and aggregate endpoint if the product surface is the problem; the existing admin guard and payment-orders page remain unchanged.
- Revoke server aggregation/insertion permissions and remove the migration only if deleting collected data is required and approved. Otherwise, leave the inaccessible table for controlled retention cleanup rather than risking an accidental data loss rollback.

## Success Criteria

- [ ] Eligible page routes across the complete App Router are recorded once per accepted navigation; API, asset, internal, prefetch, bot, and configured test-user traffic is excluded.
- [ ] Middleware recording is non-blocking: ingestion failures never alter the response, and observed navigation latency remains within the agreed production baseline.
- [ ] `page_visits` contains only the minimum UTC event fields and HMAC digests; no raw IP, cookie, query string, User-Agent, or PII is persisted or returned.
- [ ] Direct client reads/inserts are denied by RLS, while an `ADMIN_USER_IDS` administrator can retrieve the guarded aggregate API and non-admin/unauthenticated callers cannot.
- [ ] The admin section supports a bounded date range and displays daily page views, daily unique visitors, and temporal peak indicators using existing glass-card/Recharts primitives.
- [ ] Repeated visitor digests count once per UTC day, empty ranges render explicit zero/empty states, and aggregation does not transfer raw events to the browser.
- [ ] Existing admin and Vercel Analytics behavior remains unchanged.

## Proposal Question Round

The confirmed architecture and scope are treated as fixed. These remaining product questions are included to improve the proposal around business rules and operational tradeoffs; the user may answer, skip, correct an assumption, or request a second round:

1. **Retention:** What maximum retention period is acceptable for daily event rows? Assumption: retention is configured before production scale and is no longer than needed for adoption reporting.
2. **Admin traffic:** Should authorized admin usage be included because the requirement covers the whole app, or excluded to keep adoption metrics user-only? Assumption: admin pages are included unless product reporting defines staff traffic as noise.
3. **Default range:** Is a 30-day default and a bounded maximum (for example, 365 days) sufficient for the first dashboard? Assumption: yes; longer history can follow measured demand.

## Key Learnings

1. The repository already has the required admin guard, Supabase service helper, glass-card presentation, Recharts dependency, and middleware session seam; the proposal reuses them.
2. The metric must be defined at the request boundary: accepted page navigations only, daily UTC buckets, distinct HMAC visitor digests, and explicit bot/test-user exclusions.
3. Privacy and runtime safety depend on never storing raw network data and never awaiting analytics ingestion on the navigation critical path.
