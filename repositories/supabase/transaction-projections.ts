/**
 * Query Projections for Transactions Repository
 *
 * Defines which fields to select for different query types to reduce payload size
 * and optimize network/serialization costs.
 *
 * Phase 2, Task 2.3: Query projections to achieve 15-30% byte reduction on list responses
 */

/** List projection: minimal fields needed for transaction lists/grids */
export const TRANSACTION_LIST_PROJECTION = `
  id,
  type,
  account_id,
  category_id,
  currency_code,
  amount_minor,
  amount_base_minor,
  exchange_rate,
  date,
  description,
  created_at,
  transfer_id,
  is_debt,
  debt_direction,
  debt_status
`;

/** Detail projection: all fields for single transaction views */
export const TRANSACTION_DETAIL_PROJECTION = `
  id,
  type,
  account_id,
  category_id,
  currency_code,
  amount_minor,
  amount_base_minor,
  exchange_rate,
  date,
  description,
  note,
  tags,
  transfer_id,
  is_debt,
  debt_direction,
  debt_status,
  counterparty_name,
  settled_at,
  created_at,
  updated_at
`.replace(/\s+/g, '');

/**
 * Helper to get the appropriate projection for a query context
 * @param queryType - 'list' for collection queries, 'detail' for single entity
 */
export function getTransactionProjection(queryType: 'list' | 'detail'): string {
  return queryType === 'detail'
    ? TRANSACTION_DETAIL_PROJECTION
    : TRANSACTION_LIST_PROJECTION;
}
