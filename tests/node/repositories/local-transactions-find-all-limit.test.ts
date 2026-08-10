// Polyfill IndexedDB for the node test env so Dexie can run.
import 'fake-indexeddb/auto';

import type { Transaction } from '@/types';
import { TransactionType } from '@/types';
import { LocalTransactionsRepository } from '@/repositories/local/transactions-repository-impl';
import { db } from '@/repositories/local/db';

/**
 * Proves `LocalTransactionsRepository.findAll(limit?)` honors the contract
 * limit (issue #52) deterministically without changing the date-desc ordering
 * used by the cache load path.
 */
describe('LocalTransactionsRepository findAll limit', () => {
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

  it('returns at most `limit` rows, newest first', async () => {
    await db.transactions.bulkAdd([
      tx({ id: 'oldest', date: '2026-07-01' }),
      tx({ id: 'middle', date: '2026-07-10' }),
      tx({ id: 'newest', date: '2026-07-20' }),
    ]);

    const limited = await repo.findAll(2);
    expect(limited.map((t) => t.id)).toEqual(['newest', 'middle']);

    const all = await repo.findAll();
    expect(all.map((t) => t.id)).toEqual(['newest', 'middle', 'oldest']);
  });
});
