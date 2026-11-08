import 'fake-indexeddb/auto';
import { SupabasePendingItemsRepository } from '@/repositories/supabase/pending-items-repository-impl';
import { LocalPendingItemsRepository } from '@/repositories/local/pending-items-repository-impl';
import { db } from '@/repositories/local/db';
import { TransactionType } from '@/types';
import { useChatCardActions } from '@/components/ai/use-chat-card-actions';
import { useRepository } from '@/providers';
import { runFinancialMutation } from '@/lib/finance/financial-data-sync';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn(),
  useMemo: (fn: () => unknown) => fn(),
  useState: () => [[], jest.fn()],
}));
jest.mock('@/providers', () => ({ useRepository: jest.fn() }));
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user' }, baseCurrency: 'USD' }),
}));
jest.mock('@/lib/rates', () => ({ useActiveUsdVesRate: () => undefined }));
jest.mock('@/hooks/use-receipt-scanner', () => ({ compressImage: jest.fn() }));
jest.mock('@/lib/finance/financial-data-sync', () => ({
  runFinancialMutation: jest.fn(({ mutation }) => mutation()),
}));

const movement = {
  type: TransactionType.EXPENSE,
  accountId: 'account',
  categoryId: 'category',
  currencyCode: 'VES',
  amountMinor: 1250,
  exchangeRate: 40,
  date: '2026-11-08',
  description: 'Receipt',
  note: 'Lunch',
};

function makeRepo(result: { data: unknown; error: unknown }) {
  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user' } } }),
    },
    rpc: jest.fn().mockResolvedValue(result),
  };
  return { client, repo: new SupabasePendingItemsRepository(client as never) };
}

describe('pending receipt settlement', () => {
  it('calls the settlement RPC once and returns its transaction id', async () => {
    const { client, repo } = makeRepo({ data: 'transaction-id', error: null });
    await expect(repo.settle('pending-id', movement)).resolves.toBe(
      'transaction-id'
    );
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('settle_pending_expense', {
      p_pending_id: 'pending-id',
      p_account_id: 'account',
      p_category_id: 'category',
      p_type: 'EXPENSE',
      p_currency_code: 'VES',
      p_amount_minor: 1250,
      p_amount_base_minor: 31,
      p_exchange_rate: 40,
      p_date: '2026-11-08',
      p_description: 'Receipt',
      p_note: 'Lunch',
    });
  });

  it('surfaces database errors and missing ids', async () => {
    const failed = makeRepo({
      data: null,
      error: { message: 'database failure' },
    });
    await expect(failed.repo.settle('pending-id', movement)).rejects.toThrow(
      'database failure'
    );
    expect(failed.client.rpc).toHaveBeenCalledTimes(1);
    const missing = makeRepo({ data: null, error: null });
    await expect(missing.repo.settle('pending-id', movement)).rejects.toThrow(
      'missing transaction id'
    );
  });

  it('chat performs only the settlement mutation, without an update', async () => {
    const repository = {
      pendingItems: {
        settle: jest.fn().mockResolvedValue('transaction-id'),
        update: jest.fn(),
      },
      transactions: { create: jest.fn() },
    };
    jest.mocked(useRepository).mockReturnValue(repository as never);
    const actions = useChatCardActions(jest.fn());
    await actions.settlePendingReceipt('pending-id', movement);
    expect(repository.pendingItems.settle).toHaveBeenCalledWith(
      'pending-id',
      movement
    );
    expect(repository.pendingItems.update).not.toHaveBeenCalled();
    expect(repository.transactions.create).not.toHaveBeenCalled();
    expect(runFinancialMutation).toHaveBeenCalled();
  });

  it('local settlement is idempotent and rolls back if closing fails', async () => {
    await db.pendingItems.clear();
    await db.transactions.clear();
    await db.accounts.put({ id: 'account', balance: 10000 } as never);
    const repo = new LocalPendingItemsRepository();
    const item = await repo.create('user', {
      kind: 'purchase',
      name: 'Receipt',
    });
    const id = await repo.settle(item.id, movement);
    expect(await repo.settle(item.id, movement)).toBe(id);
    expect(await db.transactions.count()).toBe(1);
    const another = await repo.create('user', {
      kind: 'purchase',
      name: 'Another',
    });
    const update = jest
      .spyOn(db.pendingItems, 'update')
      .mockRejectedValueOnce(new Error('update failed'));
    await expect(repo.settle(another.id, movement)).rejects.toThrow(
      'update failed'
    );
    update.mockRestore();
    expect(await db.transactions.count()).toBe(1);
    expect((await db.pendingItems.get(another.id))?.done).toBe(false);
  });
});
