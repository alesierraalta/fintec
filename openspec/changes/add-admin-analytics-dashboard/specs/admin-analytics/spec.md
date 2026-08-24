# Admin Analytics Specification

## Purpose

Provide an admin-only overview of platform health and aggregate resource usage, together with the guarded aggregate API and the Vercel observability components. The capability MUST expose counts and bounded time-series data without exposing profile data or raw resource rows.

## Requirements

### Requirement: Fail-closed admin access and overview

The `/admin` overview and its aggregate data MUST be available only to authenticated user IDs included in the comma-separated `ADMIN_USER_IDS` configuration. Missing or empty configuration MUST authorize no users. The overview MUST redirect an unauthenticated visitor to the existing sign-in flow, show an explicit denied state to an authenticated non-admin, and present the aggregate overview to an authorized administrator. The API MUST independently enforce the same authorization and MUST return `401` for authentication failure and `403` for an authenticated non-admin.

#### Scenario: Authorized administrator opens the overview

- GIVEN an authenticated user ID is present in `ADMIN_USER_IDS`
- WHEN the user opens `/admin`
- THEN the overview is rendered with the aggregate metrics defined by this specification
- AND the user can request the corresponding aggregate data from `/api/admin/stats`

#### Scenario: Unauthenticated visitor opens the overview or API

- GIVEN no valid authenticated session is available
- WHEN the visitor opens `/admin` or requests `GET /api/admin/stats`
- THEN `/admin` redirects to the existing sign-in flow
- AND the API responds with HTTP `401`
- AND no service-role database client is created or queried for the request

#### Scenario: Authenticated non-admin is denied

- GIVEN the caller is authenticated and their user ID is not in `ADMIN_USER_IDS`, including when the configuration is unset or empty
- WHEN the caller opens `/admin` or requests `GET /api/admin/stats`
- THEN the page shows the existing denied UI state without aggregate data
- AND the API responds with HTTP `403`
- AND no service-role database client is created or queried for the request

### Requirement: Documented aggregate stats contract

`GET /api/admin/stats` MUST return one aggregate payload and MUST default an omitted `window` query parameter to `30d`. V1 MUST support the bounded values `7d`, `30d`, and `90d`; another value MUST return HTTP `400` without querying aggregate data. A successful response MUST use the project response envelope with `data`, `error: null`, and `meta.timestamp`, and its `data` MUST have this shape:

```text
{
  window: "7d" | "30d" | "90d",
  users: {
    total: number,
    newByDay: [{ date: "YYYY-MM-DD", count: number }],
    dau: number,
    wau: number,
    mau: number,
    peakDailyActive: number,
    peakDate: "YYYY-MM-DD" | null,
    activityBasis: "last_activity_at_session_refresh",
    activityStatus: "available" | "empty"
  },
  resources: {
    totals: {
      accounts: number,
      transactions: number,
      budgets: number,
      goals: number,
      subscriptions: number,
      feedbacks: number
    },
    perUserCounts: [{
      userId: string,
      accounts: number,
      transactions: number,
      budgets: number,
      goals: number,
      subscriptions: number,
      feedbacks: number
    }]
  },
  usage: {
    byMonth: [{
      monthYear: string,
      transactionCount: number,
      backupCount: number,
      apiCalls: number,
      exportCount: number,
      aiRequests: number
    }]
  }
}
```

`newByDay` and peak dates MUST use UTC calendar dates. `perUserCounts` MUST contain grouped counts keyed only by an opaque/internal `userId`; the payload MUST NOT contain email, name, authentication metadata, descriptions, or raw resource rows. Successful and error responses from this endpoint MUST use `Cache-Control: no-store`.

#### Scenario: Default aggregate response contains the documented fields

- GIVEN an authorized administrator requests `GET /api/admin/stats` without a window
- WHEN the request succeeds
- THEN the response is HTTP `200` with `data.window` equal to `30d`
- AND `data.users`, `data.resources`, and `data.usage.byMonth` are present with the documented field names and numeric count values
- AND the response contains no profile fields or raw resource records
- AND the response includes `Cache-Control: no-store`

#### Scenario: Supported window is selected

- GIVEN an authorized administrator requests `GET /api/admin/stats?window=7d`, `30d`, or `90d`
- WHEN the request succeeds
- THEN `data.window` matches the requested value
- AND `users.newByDay` and the peak calculation are bounded to that selected window

#### Scenario: Unsupported window is rejected

- GIVEN an authorized administrator requests `GET /api/admin/stats?window=365d`
- WHEN the request is validated
- THEN the response is HTTP `400` with the project error envelope
- AND no aggregate database query is executed

### Requirement: Correct aggregate definitions and ownership attribution

User totals MUST count registered rows from `users`. New-user buckets MUST count `users.created_at` in the selected bounded window. DAU, WAU, and MAU MUST count distinct users whose `users.last_activity_at` is within the trailing 24-hour, 7-day, and 30-day windows respectively. Peak daily active users MUST be the maximum distinct-user count across UTC daily buckets of `last_activity_at` in the selected window, with the corresponding UTC `peakDate`. The activity basis MUST be identified as session-refresh activity because `last_activity_at` is not request-level telemetry. If no applicable activity timestamps exist, the response MUST use zero/empty values and `activityStatus: "empty"`, never an invented activity value.

Resource totals and per-user counts MUST include accounts, transactions, budgets, goals, subscriptions, and feedbacks. Transaction ownership MUST be derived through `transactions.account_id -> accounts.user_id`; rows whose joined `accounts.user_id` is null MUST be excluded from user-attributed transaction totals and MUST NOT be assigned to a synthetic user. Other resource counts MUST use their existing `user_id` relationship. Usage MUST aggregate the existing monthly `usage_tracking` counters without changing their schema.

#### Scenario: Transactions use account ownership and exclude null owners

- GIVEN one transaction belongs to an account with `user_id = U1` and another transaction belongs to an account with `user_id = null`
- WHEN the aggregate stats are calculated
- THEN only the transaction owned by `U1` contributes to `resources.totals.transactions` and `U1`'s `perUserCounts.transactions`
- AND the null-owner transaction does not create a per-user entry or count for any user

#### Scenario: Activity metrics use distinct UTC session-refresh buckets

- GIVEN a user has one or more `last_activity_at` values applicable to the trailing windows and multiple users have activity on the same UTC date
- WHEN the aggregate stats are calculated
- THEN each user contributes at most once to `dau`, `wau`, `mau`, and each daily peak bucket
- AND `peakDailyActive` equals the largest daily distinct-user bucket in the selected window
- AND `peakDate` identifies the UTC date of that bucket
- AND the response identifies the metric basis as `last_activity_at_session_refresh`

#### Scenario: Activity source is empty or stale for the selected period

- GIVEN no users have a usable `last_activity_at` in the applicable activity windows
- WHEN the aggregate stats are calculated
- THEN `dau`, `wau`, `mau`, and `peakDailyActive` are `0`
- AND `peakDate` is `null`
- AND `users.activityStatus` is `empty`
- AND the dashboard displays an explicit no-activity/no-data state rather than presenting the values as measured request traffic

### Requirement: Vercel observability is mounted exactly once

The application MUST include both `@vercel/analytics` and `@vercel/speed-insights` as runtime dependencies. The root `app/layout.tsx` MUST mount exactly one `<Analytics />` and exactly one `<SpeedInsights />`. No nested layout or page MAY mount either component a second time, and the integration MUST NOT depend on client-side environment gating.

#### Scenario: Deployed application includes both Vercel integrations

- GIVEN the application is built from the changed dependency manifest and root layout
- WHEN the root application layout is inspected or rendered
- THEN both Vercel packages are installed and one Analytics component and one Speed Insights component are mounted
- AND no other layout or page mounts either component

### Requirement: Bounded and resilient aggregate delivery

The stats service MUST perform SQL-level aggregate reads bounded by the selected time window for trend and activity data. Resource-family reads MUST use one aggregate round trip per family or document a justified bounded number of round trips; the endpoint MUST NOT retrieve raw cross-user rows solely to aggregate them in the page or route. On the current data volume, an authorized stats request MUST complete with a success or defined error response within 2 seconds in verification. A database failure MUST return HTTP `500` using the project error envelope with `data: null`, code `INTERNAL_ERROR`, and a generic message that does not disclose database details or secrets. The failure MUST NOT return partial or fabricated metrics.

#### Scenario: Aggregate request stays bounded and within budget

- GIVEN the selected window is one of the supported bounded values and the current data volume is used
- WHEN an authorized administrator requests `/api/admin/stats?window=30d`
- THEN the service uses aggregate database operations rather than returning raw cross-user rows
- AND the request completes within 2 seconds in the project performance verification
- AND the response is one complete aggregate payload

#### Scenario: Database failure returns a safe error

- GIVEN an aggregate database operation fails
- WHEN an authorized administrator requests the stats endpoint
- THEN the response is HTTP `500` with `data: null`, `error.code: "INTERNAL_ERROR"`, and a generic user-safe error message
- AND no partial metrics or database error details are returned

#### Scenario: Optional family failure degrades independently

- GIVEN one optional resource-family query fails while users/activity queries succeed
- WHEN an authorized administrator requests the stats endpoint
- THEN the response succeeds with the other family aggregates populated
- AND the failed family slot is `{ status: "unavailable", reason: "query_failed" }`, never a false zero
- AND users/activity failures still fail the whole request

### Requirement: Observable failures and consistent user-facing states

Stats-service and route failures MUST be logged using the existing logger conventions without logging PII, authorization tokens, or service-role credentials. The overview MUST reuse the existing dashboard loading, error, and denied-state patterns and Spanish UI copy conventions. A failed or unavailable aggregate request MUST show an explicit user-facing error state and MUST NOT render an error as zero-valued metrics.

#### Scenario: Service failure is logged and shown honestly

- GIVEN the stats service returns a database failure for an authorized overview request
- WHEN the overview handles the failed request
- THEN the failure is recorded through the existing logger convention
- AND the page shows the existing dashboard error pattern with Spanish, actionable feedback
- AND the page does not display the failed metrics as zero
- AND the logged event contains no PII, token, or service-role credential
