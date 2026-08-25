# Page visits analytics

The feature records eligible document navigations asynchronously and exposes only bounded aggregates to administrators.

## Configuration

- `PAGE_VISITS_ENABLED=false` disables recording without changing navigation.
- `PAGE_VISITS_HMAC_SECRET` is a server-only secret. Each UTC date derives a separate HMAC-SHA256 digest; rotate it to prevent future cross-date correlation. Never log the secret, IP, User-Agent, cookies, or query strings.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only. RLS denies direct client access; middleware and the admin aggregate service use the service role.

Apply the migration and baseline in the repository's normal Supabase deployment order. Aggregation accepts only 7, 30, or 90 UTC days and is capped at 20 routes. Retain/delete rows by `visit_date` in bounded batches according to the approved retention policy.

Monitor ingestion failures, middleware p95, aggregate duration, and daily row growth without recording request identifiers. To roll back, set the kill switch to false first, then remove the admin section/API if needed; keep the table for controlled retention cleanup unless deletion is explicitly approved.
