/**
 * Query projections for approval requests to optimize payload size.
 */
export const APPROVAL_REQUEST_LIST_PROJECTION =
  'id, user_id, thread_id, action_type, risk_level, status, created_at';
export const APPROVAL_REQUEST_DETAIL_PROJECTION =
  'id, user_id, thread_id, action_type, action_data, risk_level, message, status, response_data, responded_at, created_at, updated_at';
