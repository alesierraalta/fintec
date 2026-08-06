/**
 * Query projections for approval requests to optimize payload size.
 */
export const APPROVAL_REQUEST_LIST_PROJECTION =
  'id, user_id, thread_id, action_type, risk_level, status, created_at';
// NOTE: `approval_requests` has no `updated_at` column (verified against
// both the source migration —
// supabase/migrations/202601112247_priority1_ai_infrastructure.sql:73-85 —
// and the production schema dump, supabase/schemas/baseline.sql:2418-2432).
// Selecting it previously threw `column approval_requests.updated_at does
// not exist` on EVERY `findById`/`findByIdForUser` call, breaking
// `waitForApproval`'s poll (lib/ai/hitl/approval.ts:29-69) on its very
// first tick for every real HITL approval in production — discovered via
// tests/db/harness/hitl-lifecycle.test.ts, the first test to exercise this
// query against a real Postgres instance instead of a mocked `.from()`.
export const APPROVAL_REQUEST_DETAIL_PROJECTION =
  'id, user_id, thread_id, action_type, action_data, risk_level, message, status, response_data, responded_at, created_at';
