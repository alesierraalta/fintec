/**
 * Budget Repository Projections
 *
 * Goals:
 * 1. Reduce payload size for list queries (30% target).
 * 2. Ensure all fields needed for Domain Budget mapping are included.
 */

/**
 * Standard projection for budget lists.
 * Omits large potential JSON fields or related data if any.
 * Includes all fields required by mapSupabaseBudgetToDomain.
 */
export const BUDGET_LIST_PROJECTION = `
  id,
  user_id,
  category_id,
  month_year,
  amount_base_minor,
  spent_base_minor,
  active,
  created_at,
  updated_at
`
  .trim()
  .replace(/\s+/g, '');

/**
 * Detailed projection for single budget retrieval.
 * Currently matches list projection but allows future extension.
 */
export const BUDGET_DETAIL_PROJECTION = BUDGET_LIST_PROJECTION;
