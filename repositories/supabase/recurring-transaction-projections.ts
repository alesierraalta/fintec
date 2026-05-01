/**
 * Recurring Transaction Repository Projections
 */

/**
 * Standard projection for recurring transactions.
 * Includes all fields required for RecurringTransaction domain mapping.
 */
export const RECURRING_TRANSACTION_LIST_PROJECTION = `
  id,
  user_id,
  name,
  type,
  account_id,
  category_id,
  currency_code,
  amount_minor,
  description,
  note,
  tags,
  frequency,
  interval_count,
  start_date,
  end_date,
  next_execution_date,
  is_active,
  created_at,
  updated_at,
  last_executed_at
`
  .trim()
  .replace(/\s+/g, '');
