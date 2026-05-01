/**
 * Query projections for AI infrastructure to optimize payload size.
 */
export const CIRCUIT_BREAKER_STATE_PROJECTION =
  'id, state, failure_count, last_failure_at, last_success_at, updated_at';
export const AGENT_CHECKPOINT_PROJECTION =
  'thread_id, user_id, step_number, checkpoint_data';
