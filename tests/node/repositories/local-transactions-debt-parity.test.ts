// Polyfill IndexedDB for the node test env so Dexie can run.
import 'fake-indexeddb/auto';

import { DebtDirection, DebtStatus } from '@/types';
import { LocalTransactionsRepository } from '@/repositories/local/transactions-repository-impl';
import { db } from '@/repositories/local/db';

/**
 * Local parity tests for the debt + deduct behavior.
 *
 * These tests use the real Dexie database instance in a fake-indexeddb-like
 * environment. The jsdom test env provides `indexedDB` so we can let Dexie
 * run against a real (in-memory) store.
 */
describe('LocalTransactionsRepository debt parity', () => {
  let repo: LocalTransactionsRepository;
  const userId = 'user-1';

  beforeEach(async () => {
    // Reset Dexie between tests.
    if (db.isOpen()) {
      await db.delete();
    }
    await db.open();
    await db.accounts.clear();
    await db.transactions.clear();
    await db.accounts.add({
      id: 'cash',
      userId,
      name: 'Cash',
      type: 'CASH' as any,
      currencyCode: 'USD',
      balance: 100000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.accounts.add({
      id: 'savings',
      userId,
      name: 'Savings',
      type: 'SAVINGS' as any,
      currencyCode: 'USD',
      balance: 50000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    repo = new LocalTransactionsRepository();
  });

  afterAll(async () => {
    if (db.isOpen()) {
      await db.delete();
    }
  });

  it('does NOT touch account balance when creating a debt-only transaction', async () => {
    await repo.create({
      type: 'EXPENSE' as any,
      accountId: 'cash',
      currencyCode: 'USD',
      amountMinor: 25000,
      date: '2026-07-06',
      description: 'Lent 250 USD to bob',
      isDebt: true,
      debtDirection: DebtDirection.OWED_TO_ME,
      debtStatus: DebtStatus.OPEN,
      deductFromAccount: false,
    } as any);

    const account = await db.accounts.get('cash');
    expect(account?.balance).toBe(100000);
  });

  it('debits the source account when deductFromAccount is true', async () => {
    const result = await repo.create({
      type: 'EXPENSE' as any,
      accountId: 'cash',
      currencyCode: 'USD',
      amountMinor: 25000,
      date: '2026-07-06',
      description: 'Lent 250 USD to bob',
      isDebt: true,
      debtDirection: DebtDirection.OWED_TO_ME,
      debtStatus: DebtStatus.OPEN,
      deductFromAccount: true,
      sourceAccountId: 'savings',
    } as any);

    // Savings was debited by 250 USD (25000 minor).
    const savings = await db.accounts.get('savings');
    expect(savings?.balance).toBe(50000 - 25000);

    // Cash was NOT touched by the debt (debt never touches balance).
    const cash = await db.accounts.get('cash');
    expect(cash?.balance).toBe(100000);

    // Two transactions were created: the debt (skip) and the linked EXPENSE.
    const all = await db.transactions.toArray();
    expect(all).toHaveLength(2);
    const debtRow = all.find((t) => t.isDebt);
    const expenseRow = all.find((t) => !t.isDebt);
    expect(debtRow).toBeDefined();
    expect(expenseRow).toBeDefined();
    expect(expenseRow?.accountId).toBe('savings');
    expect(expenseRow?.type).toBe('EXPENSE');
    expect(result.id).toBe(debtRow?.id);
  });

  it('skips balance adjustment on update for a debt transaction', async () => {
    const created = await repo.create({
      type: 'EXPENSE' as any,
      accountId: 'cash',
      currencyCode: 'USD',
      amountMinor: 10000,
      date: '2026-07-06',
      description: 'Test debt',
      isDebt: true,
      debtDirection: DebtDirection.OWE,
      debtStatus: DebtStatus.OPEN,
      deductFromAccount: false,
    } as any);

    const before = (await db.accounts.get('cash'))?.balance;

    // Update the debt — amount and direction change, but balance must NOT
    // move (debt is metadata).
    await repo.update(created.id, {
      type: 'EXPENSE' as any,
      accountId: 'cash',
      currencyCode: 'USD',
      amountMinor: 20000,
      date: '2026-07-06',
      description: 'Updated debt',
      isDebt: true,
      debtDirection: DebtDirection.OWE,
      debtStatus: DebtStatus.OPEN,
    } as any);

    const after = (await db.accounts.get('cash'))?.balance;
    expect(after).toBe(before);
  });

  it('skips balance adjustment on delete for a debt transaction', async () => {
    const created = await repo.create({
      type: 'EXPENSE' as any,
      accountId: 'cash',
      currencyCode: 'USD',
      amountMinor: 10000,
      date: '2026-07-06',
      description: 'Test debt',
      isDebt: true,
      debtDirection: DebtDirection.OWE,
      debtStatus: DebtStatus.OPEN,
      deductFromAccount: false,
    } as any);

    const before = (await db.accounts.get('cash'))?.balance;
    await repo.delete(created.id);
    const after = (await db.accounts.get('cash'))?.balance;
    expect(after).toBe(before);
  });
});
