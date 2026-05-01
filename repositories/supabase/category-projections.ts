/**
 * Query Projections for Categories Repository
 *
 * Defines which fields to select for different query types to reduce payload size
 * and optimize network/serialization costs.
 *
 * Phase 2, Task 2.4: Query projections to achieve 15-30% byte reduction on list responses
 */

/** List projection: minimal fields needed for category lists/selectors */
export const CATEGORY_LIST_PROJECTION = `
  id,
  name,
  kind,
  color,
  icon,
  parent_id,
  active,
  user_id,
  is_default,
  created_at,
  updated_at
`;

/** Detail projection: all fields for single category views */
export const CATEGORY_DETAIL_PROJECTION = '*';

/**
 * Helper to get the appropriate projection for a query context
 * @param queryType - 'list' for collection queries, 'detail' for single entity
 */
export function getCategoryProjection(queryType: 'list' | 'detail'): string {
  return queryType === 'detail'
    ? CATEGORY_DETAIL_PROJECTION
    : CATEGORY_LIST_PROJECTION;
}
