// Setup for the `db` Jest project only. These tests run against a REAL
// local Supabase stack (see supabase/config.toml — ports shifted for this
// worktree, per tests/db/support/env.ts). Unlike jest.setup.js (used by
// the `dom`/`node` projects), this file MUST NOT mock `fetch` and MUST
// NOT override the Supabase env vars with fake values — jest.setup.js
// does both (`global.fetch = jest.fn(...)`, `NEXT_PUBLIC_SUPABASE_URL ||=
// 'https://example.supabase.co'`), which silently breaks every real
// network call a db test makes. Node's native fetch/Headers/TextEncoder
// are sufficient here, so nothing needs to be polyfilled.

// Real DB round-trips (GoTrue admin API, RLS-enforced RPCs, embedding
// backfill) are slower than in-memory unit tests.
jest.setTimeout(30000);

// `repositories/supabase/client.ts` reads these at module-load time to
// build its module-level singleton client (used by
// `createServerAppRepository`). These are the REAL local stack's URL/anon
// key (identical to the defaults in tests/db/support/env.ts) — NOT fake
// placeholder values, so real RPC/table calls keep working. Only set when
// absent so an explicit CI override still wins.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54421';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??=
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
