import {
  emitFinancialDataChange,
  reloadFinancialData,
  runFinancialMutation,
  subscribeFinancialData,
} from '@/lib/finance/financial-data-sync';
import { resetOptimizedDataStore } from '@/lib/cache/optimized-data-cache';
import type { AppRepository } from '@/repositories/contracts';

function repository() {
  return {
    transactions: { findAll: jest.fn().mockResolvedValue([{ id: 'tx' }]) },
    accounts: { findByUserId: jest.fn().mockResolvedValue([{ id: 'account' }]) },
    categories: { findAll: jest.fn().mockResolvedValue([{ id: 'category' }]) },
    budgets: { findActive: jest.fn() },
  } as unknown as AppRepository;
}

describe('financial data synchronization', () => {
  beforeEach(() => {
    resetOptimizedDataStore();
  });

  it('rejects unauthenticated mutations before executing them', async () => {
    const mutation = jest.fn().mockResolvedValue('created');

    await expect(
      runFinancialMutation({
        repository: repository(),
        domains: ['transactions'],
        mutation,
      }),
    ).rejects.toThrow('Authentication required');

    expect(mutation).not.toHaveBeenCalled();
  });

  it('runs the mutation before authoritative reload and emits one event', async () => {
    const repo = repository();
    const order: string[] = [];
    repo.transactions.findAll = jest.fn().mockImplementation(async () => {
      order.push('reload');
      return [];
    });
    const listener = jest.fn(() => order.push('event'));
    const unsubscribe = subscribeFinancialData('user-a', listener);

    await runFinancialMutation({
      userId: 'user-a',
      repository: repo,
      domains: ['transactions', 'accounts', 'budgets'],
      mutation: async () => { order.push('mutation'); return 'created'; },
    });

    expect(order).toEqual(['mutation', 'reload', 'event']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(repo.budgets.findActive).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('awaits asynchronous listeners without letting listener failures reject the event', async () => {
    const listener = jest.fn(async () => {
      await Promise.resolve();
      throw new Error('view refresh failed');
    });
    const unsubscribe = subscribeFinancialData('user-a-listener', listener);

    await expect(
      emitFinancialDataChange('user-a-listener', ['transactions']),
    ).resolves.toBeUndefined();

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('serializes authenticated mutations and authoritative reloads per user', async () => {
    const repo = repository();
    let releaseFirstReload!: () => void;
    const firstReload = new Promise<void>((resolve) => {
      releaseFirstReload = resolve;
    });
    const order: string[] = [];
    repo.transactions.findAll = jest.fn(async () => {
      order.push('reload-start');
      if (order.filter((item) => item === 'reload-start').length === 1) {
        await firstReload;
      }
      order.push('reload-end');
      return [];
    });

    const first = runFinancialMutation({
      userId: 'queued-user',
      repository: repo,
      domains: ['transactions'],
      mutation: async () => {
        order.push('mutation-1');
        return 1;
      },
    });
    const second = runFinancialMutation({
      userId: 'queued-user',
      repository: repo,
      domains: ['transactions'],
      mutation: async () => {
        order.push('mutation-2');
        return 2;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(['mutation-1', 'reload-start']);
    releaseFirstReload();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(order).toEqual([
      'mutation-1',
      'reload-start',
      'reload-end',
      'mutation-2',
      'reload-start',
      'reload-end',
    ]);
  });

  it('deduplicates concurrent reloads without dropping requested domains', async () => {
    const repo = repository();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    repo.transactions.findAll = jest.fn(async () => { await gate; return []; });

    const first = reloadFinancialData(repo, 'user-a', ['transactions']);
    const second = reloadFinancialData(repo, 'user-a', ['accounts']);
    release();
    await Promise.all([first, second]);

    expect(repo.transactions.findAll).toHaveBeenCalledTimes(1);
    expect(repo.accounts.findByUserId).toHaveBeenCalledTimes(1);
  });
});
