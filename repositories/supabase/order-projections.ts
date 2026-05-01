/**
 * Query projections for orders to optimize payload size.
 */
export const ORDER_LIST_PROJECTION =
  'id, user_id, service_name, amount, sender_reference, status, created_at';
