/**
 * Scrape Attempts Repository Projections
 *
 * Following the pattern from rates-history-projections.ts.
 * No caching needed — these are operational monitoring queries, not hot-path reads.
 * See design decision: "No read cache for scrape attempts"
 */

export const SCRAPE_ATTEMPT_INSERT_PROJECTION = `
  attempt_id, provider, trigger, stage, status,
  failure_reason, started_at, finished_at,
  extracted_currencies, metadata
`
  .trim()
  .replace(/\s+/g, ',');

export const SCRAPE_ATTEMPT_LIST_PROJECTION = `
  attempt_id, provider, trigger, stage, status,
  failure_reason, started_at, finished_at,
  extracted_currencies, metadata, created_at
`
  .trim()
  .replace(/\s+/g, ',');
