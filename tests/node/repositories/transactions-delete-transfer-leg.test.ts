/**
 * #119: deleting one leg of a transfer from the transactions list must
 * delete the whole transfer atomically, never leave the other leg orphaned.
 */
import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';

function makeRepository(existing: Record<string, unknown> | null) {
  const rpc = jest.fn().mockResolvedValue({ error: null });
  const repository = new SupabaseTransactionsRepository(
    { rpc } as any,
    { userId: 'user-1' } as any,
    { embedDocument: jest.fn() } as any
  );
  jest.spyOn(repository, 'findById').mockResolvedValue(existing as any);
  return { repository, rpc };
}

describe('SupabaseTransactionsRepository.delete transfer legs (#119)', () => {
  it('deletes the whole transfer when the transaction is a transfer leg', async () => {
    const { repository, rpc } = makeRepository({
      id: 'tx-out',
      transferId: 'tr-1',
      type: 'TRANSFER_OUT',
    });

    await repository.delete('tx-out');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('delete_transfer', {
      p_transfer_id: 'tr-1',
    });
  });

  it('keeps deleting plain transactions one by one', async () => {
    const { repository, rpc } = makeRepository({ id: 'tx-1', type: 'EXPENSE' });

    await repository.delete('tx-1');

    expect(rpc).toHaveBeenCalledWith('delete_transaction_and_adjust_balance', {
      transaction_id: 'tx-1',
    });
  });
});
