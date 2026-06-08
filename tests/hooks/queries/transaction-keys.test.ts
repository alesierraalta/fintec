/**
 * Task 2.8: Transaction Query Key Factory
 *
 * Tests for the query key factory that creates consistent React Query keys.
 * Follows the factory pattern from the design doc.
 */

import type { TransactionType } from '@/types';

describe('transactionKeys', () => {
  it('should export transactionKeys from the factory file', async () => {
    const mod = await import('@/hooks/queries/transaction-keys');
    expect(mod.transactionKeys).toBeDefined();
    expect(typeof mod.transactionKeys).toBe('object');
  });

  it('should have all key methods', async () => {
    const { transactionKeys } = await import('@/hooks/queries/transaction-keys');

    expect(typeof transactionKeys.all).toBe('object');
    expect(typeof transactionKeys.lists).toBe('function');
    expect(typeof transactionKeys.list).toBe('function');
    expect(typeof transactionKeys.details).toBe('function');
    expect(typeof transactionKeys.detail).toBe('function');
    expect(typeof transactionKeys.monthlyReport).toBe('function');
  });

  it('should create consistent keys', async () => {
    const { transactionKeys } = await import('@/hooks/queries/transaction-keys');

    // Root key
    expect(transactionKeys.all).toEqual(['transactions']);

    // Lists
    expect(transactionKeys.lists()).toEqual(['transactions', 'list']);

    // List with filters
    const filters = { type: 'EXPENSE' as TransactionType, accountId: 'acc-1' };
    expect(transactionKeys.list(filters)).toEqual([
      'transactions',
      'list',
      filters,
    ]);

    // Details
    expect(transactionKeys.details()).toEqual(['transactions', 'detail']);

    // Detail with ID
    expect(transactionKeys.detail('tx-1')).toEqual([
      'transactions',
      'detail',
      'tx-1',
    ]);

    // Monthly report
    expect(transactionKeys.monthlyReport(2024, 1)).toEqual([
      'transactions',
      'monthly',
      2024,
      1,
    ]);
  });
});
