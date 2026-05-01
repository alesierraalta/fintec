/**
 * Query Projections for Exchange Rates Repository
 *
 * Defines which fields to select for different query types to reduce payload size
 * and optimize network/serialization costs.
 *
 * Phase 2, Task 2.5: Query projections to achieve 15-30% byte reduction on list responses
 */

/** List projection: minimal fields needed for exchange rate lists/calculations */
export const EXCHANGE_RATE_LIST_PROJECTION = `
  id,
  base_currency,
  quote_currency,
  rate,
  date,
  provider,
  created_at
`;

/** Detail projection: all fields for single exchange rate views */
export const EXCHANGE_RATE_DETAIL_PROJECTION = EXCHANGE_RATE_LIST_PROJECTION;

/**
 * Helper to get the appropriate projection for a query context
 * @param queryType - 'list' for collection queries, 'detail' for single entity
 */
export function getExchangeRateProjection(
  queryType: 'list' | 'detail'
): string {
  return queryType === 'detail'
    ? EXCHANGE_RATE_DETAIL_PROJECTION
    : EXCHANGE_RATE_LIST_PROJECTION;
}
