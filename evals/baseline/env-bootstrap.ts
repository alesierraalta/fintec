/**
 * MUST be the first import in any standalone eval script (run-baseline.ts,
 * run-gate.ts) — ES module imports execute top-to-bottom, and
 * `repositories/supabase/client.ts` reads these env vars at module-load
 * time to build its singleton client. Real local-stack values (identical
 * to tests/db/support/env.ts's defaults) — NOT placeholders. Only set when
 * absent so an explicit override (e.g. a CI-generated local stack) wins.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54421';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??=
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
