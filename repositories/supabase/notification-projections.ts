/**
 * Query projections for notifications to optimize payload size.
 */
export const NOTIFICATION_LIST_PROJECTION =
  'id, user_id, title, message, type, is_read, action_url, created_at, updated_at';
