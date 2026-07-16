// Polyfill IndexedDB for the node test env so Dexie can run.
import 'fake-indexeddb/auto';

import type { Transaction } from '@/types';
import { TransactionType } from '@/types';
import { LocalTransactionsRepository } from '@/repositories/local/transactions-repository-impl';
import { db } from '@/repositories/local/db';

/**
 * Repository-level proof for the category drilldown's date filtering.
 *
 * These tests run the REAL `findByFilters` inclusive-range logic against a
 * real (in-memory) Dexie store, so they verify the actual `>=`/`<=` boundary
 * comparison and the exclusion of out-of-range rows — not a mocked repository
 * call shape. They close the SPEC-001 (inclusive boundaries) and SPEC-002
 * (filtered-empty vs category-empty) gaps flagged in the verification report.
 */
describe('LocalTransactionsRepository date filtering', () => {
  let repo: LocalTransactionsRepository;

  const tx = (over: Partial<Transaction>): Transaction => ({
    id: 'txn',
    type: TransactionType.EXPENSE,
    accountId: 'cash',
    categoryId: 'food',
    currencyCode: 'USD',
    amountMinor: 1000,
    amountBaseMinor: 1000,
    exchangeRate: 1,
    date: '2026-07-10',
    description: 'seed',
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
    ...over,
  });

  beforeEach(async () => {
    if (db.isOpen()) {
      await db.delete();
    }
    await db.open();
    await db.transactions.clear();
    repo = new LocalTransactionsRepository();
  });

  afterAll(async () => {
    if (db.isOpen()) {
      await db.delete();
    }
  });

  it('includes both boundary dates and excludes out-of-range rows', async () => {
    await db.transactions.bulkAdd([
      tx({ id: 'before', date: '2026-06-30', description: 'Before range' }),
      tx({ id: 'start', date: '2026-07-01', description: 'Start boundary' }),
      tx({ id: 'end', date: '2026-07-15', description: 'End boundary' }),
      tx({ id: 'after', date: '2026-07-16', description: 'After range' }),
    ]);

    const result = await repo.findByFilters({
      categoryIds: ['food'],
      dateFrom: '2026-07-01',
      dateTo: '2026-07-15',
    });

    const ids = result.data.map((t) => t.id).sort();
    expect(ids).toEqual(['end', 'start']);
    expect(result.total).toBe(2);
  });

  it('distinguishes a date-filtered-empty result from an empty category', async () => {
    await db.transactions.add(tx({ id: 'in-july', date: '2026-07-10' }));

    // The category itself has data...
    const unfiltered = await repo.findByFilters({ categoryIds: ['food'] });
    expect(unfiltered.total).toBe(1);

    // ...but a date filter outside its range yields an empty result, proving
    // the "filtered-empty" state is caused by the filter, not a bare category.
    const filtered = await repo.findByFilters({
      categoryIds: ['food'],
      dateFrom: '2026-08-01',
    });
    expect(filtered.total).toBe(0);
    expect(filtered.data).toHaveLength(0);
  });
});
