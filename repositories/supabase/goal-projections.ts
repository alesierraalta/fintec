/**
 * Goal Repository Projections
 *
 * Goals:
 * 1. Reduce payload size for list queries (30% target).
 * 2. Ensure all fields needed for Domain SavingsGoal mapping are included.
 */

/**
 * Standard projection for goals lists.
 * Omits large potential JSON fields or related data if any.
 * Includes all fields required by mapSupabaseGoalToDomain.
 */
export const GOAL_LIST_PROJECTION = `
  id,
  name,
  description,
  target_base_minor,
  current_base_minor,
  target_date,
  account_id,
  active,
  created_at,
  updated_at
`
  .trim()
  .replace(/\s+/g, '');

/**
 * Detailed projection for single goal retrieval.
 * Currently matches list projection but allows future extension.
 */
export const GOAL_DETAIL_PROJECTION = GOAL_LIST_PROJECTION;
