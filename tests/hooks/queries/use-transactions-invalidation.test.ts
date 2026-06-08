/**
 * Task 3.8: Cache Invalidation Strategy for useTransactions
 *
 * Tests for cache invalidation patterns in useTransactions hook.
 * Verifies that the hook properly invalidates related queries on mutations.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTransactionsInvalidation, getInvalidationKeys } from '@/hooks/queries/use-transactions';

describe('useTransactions cache invalidation', () => {
  it('should export useTransactionsInvalidation helper', () => {
    expect(typeof useTransactionsInvalidation).toBe('function');
  });

  it('should export getInvalidationKeys helper', () => {
    expect(typeof getInvalidationKeys).toBe('function');
  });
});

describe('getInvalidationKeys', () => {
  it('should return list tags for a create operation', () => {
    const keys = getInvalidationKeys({ type: 'create', accountId: 'acc-1' });
    expect(keys).toEqual(
      expect.arrayContaining([
        ['transactions', 'tag', 'list'],
        ['transactions', 'tag', 'account', 'acc-1'],
      ])
    );
  });

  it('should return list and detail tags for an update operation', () => {
    const keys = getInvalidationKeys({ type: 'update', transactionId: 'tx-1', accountId: 'acc-1' });
    expect(keys).toEqual(
      expect.arrayContaining([
        ['transactions', 'tag', 'list'],
        ['transactions', 'tag', 'detail', 'tx-1'],
        ['transactions', 'tag', 'account', 'acc-1'],
      ])
    );
  });

  it('should return list tags for a delete operation', () => {
    const keys = getInvalidationKeys({ type: 'delete', transactionId: 'tx-1', accountId: 'acc-1' });
    expect(keys).toEqual(
      expect.arrayContaining([
        ['transactions', 'tag', 'list'],
        ['transactions', 'tag', 'detail', 'tx-1'],
        ['transactions', 'tag', 'account', 'acc-1'],
      ])
    );
  });

  it('should return monthly report tags when year/month provided', () => {
    const keys = getInvalidationKeys({ type: 'create', accountId: 'acc-1', year: 2026, month: 5 });
    expect(keys).toEqual(
      expect.arrayContaining([
        ['transactions', 'tag', 'list'],
        ['transactions', 'tag', 'account', 'acc-1'],
        ['transactions', 'tag', 'monthly', 2026, 5],
      ])
    );
  });
});

describe('useTransactionsInvalidation hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient();
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('should return an object with onTransactionCreated, onTransactionUpdated, onTransactionDeleted methods', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransactionsInvalidation(), { wrapper });

    expect(typeof result.current.onTransactionCreated).toBe('function');
    expect(typeof result.current.onTransactionUpdated).toBe('function');
    expect(typeof result.current.onTransactionDeleted).toBe('function');
  });
});
