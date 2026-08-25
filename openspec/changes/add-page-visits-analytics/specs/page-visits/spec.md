# Page Visits Analytics Specification

## Purpose

Provide first-party, admin-visible page-visit analytics for the App Router while preserving navigation reliability and preventing storage of raw IP addresses or tracking identifiers.

## Requirements

### Requirement: Eligible App Router requests SHALL register page views

The system SHALL register one page-view event for each eligible App Router document/navigation request, including public, authenticated, and admin pages. The request predicate SHALL exclude API routes, static resources, `_next` resources, image/favicon assets, RSC/data prefetches, and other non-page requests. The stored path SHALL be the normalized pathname without a query string.

#### Scenario: Eligible page navigation is recorded

- GIVEN a request for an App Router page with a normal document/navigation request
- WHEN middleware processes the request
- THEN it SHALL schedule exactly one page-view event with the normalized pathname
- AND the behavior SHALL apply equally to public, authenticated, and admin pages

#### Scenario: Non-page traffic is excluded

- GIVEN a request for an API route, `_next` resource, static asset, RSC/data prefetch, or other non-page resource
- WHEN middleware evaluates the request
- THEN it SHALL not schedule a page-view event
- AND the request response SHALL retain its existing behavior

#### Scenario: Query parameters are not persisted

- GIVEN an eligible request whose URL contains a query string
- WHEN its event is created
- THEN the event path SHALL contain only the normalized pathname
- AND no query parameter value SHALL be stored or returned by the analytics API

### Requirement: Page-view events SHALL apply privacy and exclusion rules

Each recorded event SHALL contain a UTC timestamp, normalized path, an `ip_hash` produced with HMAC-SHA256 using a server-side secret from environment configuration, and the request `user_agent`. The system SHALL never persist the raw IP address. The system SHALL exclude requests from known bots using a bounded, case-insensitive User-Agent filter and SHALL exclude configured test users using `lib/admin/test-users.ts`. A missing User-Agent SHALL not be treated as a bot by default.

If the HMAC secret is unavailable, the system SHALL skip the event rather than store a raw IP or use an unhashed substitute. Raw IP addresses, HMAC secrets, cookies, user IDs, and other identity data SHALL not be written to logs or exposed in aggregate responses.

#### Scenario: IP data is anonymized before persistence

- GIVEN an eligible request with a source IP and a configured HMAC secret
- WHEN the event is persisted
- THEN `ip_hash` SHALL equal the HMAC-SHA256 digest for the normalized IP and configured secret
- AND the raw IP SHALL not appear in the persisted row, logs, or API response

#### Scenario: Missing HMAC secret fails closed

- GIVEN an eligible request and no configured HMAC secret
- WHEN middleware attempts to create the event
- THEN it SHALL skip persistence
- AND it SHALL not persist the raw IP or an unhashed replacement
- AND the navigation response SHALL still complete normally

#### Scenario: Bots and test users are excluded

- GIVEN a request with a case-insensitive User-Agent matching the bounded bot filter
- OR a request associated with a configured test user identified through `lib/admin/test-users.ts`
- WHEN middleware evaluates the request
- THEN it SHALL not create a page-view event

#### Scenario: Missing User-Agent is eligible

- GIVEN an otherwise eligible request with no User-Agent header
- WHEN middleware evaluates the request
- THEN the missing header alone SHALL not exclude the request

### Requirement: Page-view ingestion SHALL be non-blocking

Middleware SHALL construct the navigation response before scheduling analytics ingestion. It SHALL use `waitUntil` when supported by the runtime and a caught fire-and-forget fallback otherwise. Ingestion failures, timeouts, or Supabase errors SHALL never change the navigation response or become an unhandled rejection.

#### Scenario: Ingestion does not block navigation

- GIVEN an eligible page request
- WHEN middleware creates the response
- THEN it SHALL return the response without awaiting the persistence network operation
- AND the ingestion task SHALL be scheduled after response construction

#### Scenario: Ingestion failure does not affect the response

- GIVEN an eligible page request whose analytics persistence operation fails
- WHEN middleware finishes processing the request
- THEN the original navigation response status, headers, and body behavior SHALL be preserved
- AND the failure SHALL be handled without an unhandled rejection

#### Scenario: Middleware performance remains bounded

- GIVEN production-like eligible and excluded requests
- WHEN middleware latency is measured
- THEN analytics instrumentation SHALL add no more than 15 ms at p95 to the middleware critical path
- AND ingestion SHALL remain fire-and-forget

### Requirement: Supabase SHALL persist page visits with required controls

A Supabase migration SHALL create a `page_visits` table with a UUID key and columns for the normalized path, UTC `visited_at`, `ip_hash`, and `user_agent`. The table SHALL provide an index on `(visited_at, path)` and any supporting index required for bounded daily distinct-visitor aggregation. RLS SHALL be enabled.

RLS SHALL permit INSERT for anonymous and authenticated roles, while direct SELECT access for those roles SHALL not be permitted. Administrative reads SHALL occur only through the server-side service-role path after the existing `ADMIN_USER_IDS` authorization guard. The service-role credential SHALL remain server-only.

#### Scenario: Migration creates the analytics storage

- GIVEN the page-visits migration is applied
- WHEN the database schema is inspected
- THEN `page_visits` SHALL exist with UUID identity, UTC timestamp, normalized path, `ip_hash`, and `user_agent` columns
- AND the `(visited_at, path)` index SHALL exist
- AND RLS SHALL be enabled for the table

#### Scenario: Anonymous and authenticated insertion is permitted

- GIVEN an insert performed under the anonymous or authenticated database role with a valid page-visit payload
- WHEN RLS evaluates the operation
- THEN the insert SHALL be permitted
- AND the operation SHALL not grant that role SELECT access

#### Scenario: Direct reads are denied

- GIVEN an anonymous or authenticated client
- WHEN it attempts to select rows from `page_visits`
- THEN RLS SHALL deny the read
- AND event rows, hashes, User-Agent values, and raw event details SHALL not be returned

#### Scenario: Admin service reads are guarded

- GIVEN an authenticated caller whose ID is in `ADMIN_USER_IDS`
- WHEN the guarded server path queries page visits with the service-role client
- THEN the query SHALL be permitted after the admin guard succeeds
- AND a caller outside `ADMIN_USER_IDS` SHALL not reach the aggregate query path

### Requirement: The admin visits API SHALL return bounded UTC aggregates

The system SHALL expose `GET /api/admin/visits?range=7d|30d|90d`. The endpoint SHALL require the existing admin authorization conventions and SHALL reject unauthenticated or non-admin callers. The default range SHALL be 30 days when `range` is omitted; unsupported range values SHALL return a client error without querying unbounded data.

The endpoint SHALL aggregate in SQL using UTC daily buckets and indexed columns. Its aggregate-only response SHALL include total page views, total unique visitors for the selected range, daily distinct-visitor counts using `COUNT DISTINCT ip_hash`, per-path totals, a contiguous daily series for the selected range, and peak day/value information. It SHALL return explicit zero-valued buckets for days without events and SHALL never return event rows, raw IPs, hashes, User-Agent values, query strings, or user identity fields.

#### Scenario: Admin requests a supported range

- GIVEN an authorized administrator
- WHEN the administrator sends `GET /api/admin/visits?range=7d`, `30d`, or `90d`
- THEN the endpoint SHALL return aggregate data for exactly the corresponding UTC calendar range
- AND the response SHALL include totals, daily page views, daily unique visitors, per-path totals, and peak information

#### Scenario: Default range is bounded

- GIVEN an authorized administrator who omits the `range` parameter
- WHEN the administrator requests `GET /api/admin/visits`
- THEN the endpoint SHALL use the 30-day UTC range
- AND it SHALL not query an unbounded event history

#### Scenario: Invalid range is rejected

- GIVEN an authorized administrator who supplies a range other than `7d`, `30d`, or `90d`
- WHEN the endpoint receives the request
- THEN it SHALL return a client-error response using existing admin API conventions
- AND it SHALL not execute an unbounded aggregation query

#### Scenario: Daily unique visitors count repeated hashes once

- GIVEN multiple page visits with the same `ip_hash` on one UTC day and visits with different hashes on that day
- WHEN the aggregate query runs
- THEN that day’s unique-visitor value SHALL count the repeated hash once and each distinct hash once
- AND the daily result SHALL be produced by database-side aggregation

#### Scenario: Empty days and empty ranges are explicit

- GIVEN a supported date range with no events on one or more days
- WHEN the endpoint returns the aggregate
- THEN the daily series SHALL contain a bucket for every UTC day in the range with zero values where applicable
- AND totals and peak values SHALL be zero or an explicitly empty result according to the response contract

#### Scenario: Aggregate response contains no identifying event data

- GIVEN an authorized administrator requests a supported range
- WHEN the endpoint returns its response
- THEN it SHALL contain only aggregate totals, daily series, peaks, and route aggregates
- AND it SHALL not contain raw event rows, `ip_hash`, raw IP, `user_agent`, query parameters, or user IDs

#### Scenario: API authorization is enforced

- GIVEN an unauthenticated caller or an authenticated caller not included in `ADMIN_USER_IDS`
- WHEN the caller requests the visits endpoint
- THEN the endpoint SHALL return the established unauthorized/forbidden response
- AND it SHALL not disclose aggregate data or execute the service-role aggregate query

### Requirement: The admin dashboard SHALL present visits using existing UI conventions

The existing `app/admin/page.tsx` SHALL include a "Visitas" section without changing its current authorization or payment-orders behavior. For authorized administrators, the section SHALL provide stat cards for total visits, unique visitors, and peak traffic; a `7d`/`30d`/`90d` selector; a Recharts daily graph; and a top-routes table. The section SHALL use the existing glass-card styling, loading skeletons, empty/error states, responsive chart conventions, and i18n system.

#### Scenario: Authorized admin sees the visits section

- GIVEN an administrator who can already access `/admin`
- WHEN the admin page loads
- THEN it SHALL display the "Visitas" section with total, unique, and peak stat cards
- AND it SHALL display the range selector, daily chart, and top-routes table

#### Scenario: Range selection refreshes aggregates

- GIVEN an authorized administrator viewing the visits section
- WHEN the administrator selects `7d`, `30d`, or `90d`
- THEN the UI SHALL request the matching bounded API range
- AND the cards, chart, peaks, and top-routes table SHALL reflect that range

#### Scenario: Loading, empty, and error states are usable

- GIVEN the visits API is loading, returns no events, or returns an error
- WHEN the visits section renders
- THEN it SHALL show the existing loading skeleton, explicit empty state, or existing error presentation respectively
- AND it SHALL not expose raw event data in any state

#### Scenario: Existing admin behavior remains unchanged

- GIVEN any existing admin authorization outcome or payment-orders behavior
- WHEN the page-visits section is added
- THEN the existing authorized, unauthorized, and denied flows SHALL continue to work
- AND payment-orders functionality SHALL remain available without a second admin guard

### Requirement: Page visits SHALL remain first-party and tracking-free

The feature SHALL not add third-party tracking, tracking cookies, local-storage identifiers, cross-site identifiers, realtime streams, or user-level analytics. It SHALL expose only the aggregate admin dashboard and SHALL not implement route-detail exploration, exports, attribution, or historical backfill.

#### Scenario: No tracking identifiers are introduced

- GIVEN the page-visits feature is enabled
- WHEN an eligible page is visited
- THEN the feature SHALL not set a tracking cookie or local-storage identifier
- AND it SHALL not send page-visit data to a third-party analytics provider

## Non-goals

- Third-party tracking or additional Vercel instrumentation.
- Tracking cookies, localStorage identifiers, advertising profiles, or cross-site tracking.
- User-level analytics, session replay, funnels, cohorts, realtime updates, exports, alerts, attribution, route-detail exploration, or historical backfill.
