/**
 * Unit tests for the new PR3 formatters added to `lib/ai/tools/formatters.ts`:
 *   - `formatQueryResult` — renders `query_transactions` RPC rows (sum, avg,
 *     count, groupBy aggregate modes).
 *   - `formatSearchResults` — renders `hybrid_search_transactions` RPC rows.
 *
 * Per design's "resolvers/formatters new tools" testing layer: pure
 * functions, no mocks needed.
 */

import {
  formatQueryResult,
  formatSearchResults,
} from '@/lib/ai/tools/formatters';

describe('lib/ai/tools/formatters — formatQueryResult', () => {
  it('formats a single-row sum aggregate result', () => {
    const result = formatQueryResult(
      [{ group_key: null, result_value: 12345, row_count: 3 }],
      'sum'
    );

    expect(result).toContain('3');
    expect(result).toMatch(/123\.45|12345/);
  });

  it('formats a single-row count aggregate result (triangulation)', () => {
    const result = formatQueryResult(
      [{ group_key: null, result_value: 7, row_count: 7 }],
      'count'
    );

    expect(result).toContain('7');
  });

  it('formats a groupBy aggregate result with one row per non-empty group', () => {
    const rows = [
      { group_key: 'food', result_value: 5000, row_count: 4 },
      { group_key: 'transport', result_value: 2000, row_count: 2 },
    ];

    const result = formatQueryResult(rows, 'groupBy');

    expect(result).toContain('food');
    expect(result).toContain('transport');
  });

  it('returns a no-results message when the aggregate row_count is zero', () => {
    const result = formatQueryResult(
      [{ group_key: null, result_value: 0, row_count: 0 }],
      'sum'
    );

    expect(result.toLowerCase()).toMatch(/no|0/);
  });

  it('returns a no-results message when rows array is empty (groupBy with zero matching groups)', () => {
    const result = formatQueryResult([], 'groupBy');

    expect(result.toLowerCase()).toMatch(/no/);
  });
});

describe('lib/ai/tools/formatters — formatSearchResults', () => {
  const rows = [
    {
      id: 'tx-1',
      description: 'Café Central',
      amount_base_minor: 1500,
      date: '2026-06-10',
      score: 0.9,
    },
    {
      id: 'tx-2',
      description: 'Netflix',
      amount_base_minor: 999,
      date: '2026-06-05',
      score: 0.7,
    },
  ];

  it('formats ranked search results including description and amount', () => {
    const result = formatSearchResults(rows, 20);

    expect(result).toContain('Café Central');
    expect(result).toContain('Netflix');
  });

  it('truncates results to the given limit (triangulation)', () => {
    const manyRows = Array.from({ length: 5 }, (_, i) => ({
      id: `tx-${i}`,
      description: `Merchant ${i}`,
      amount_base_minor: 100 * (i + 1),
      date: '2026-06-01',
      score: 1 - i * 0.1,
    }));

    const result = formatSearchResults(manyRows, 2);

    expect(result).toContain('Merchant 0');
    expect(result).toContain('Merchant 1');
    expect(result).not.toContain('Merchant 2');
  });

  it('returns a no-results message for an empty result set', () => {
    const result = formatSearchResults([], 20);

    expect(result.toLowerCase()).toMatch(/no/);
  });
});
