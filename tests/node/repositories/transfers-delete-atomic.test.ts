/**
 * #119: deleting a transfer must call the atomic delete_transfer RPC once
 * (both legs, commission and transfer row in one transaction), never the
 * per-leg delete with the non-existent transaction_id_input argument.
 */
import { SupabaseTransfersRepository } from '@/repositories/supabase/transfers-repository-impl';

function makeClient(rpcResult: { error: { message: string } | null }) {
  const rpc = jest.fn().mockResolvedValue(rpcResult);
  const from = jest.fn((table: string) => {
    if (table === 'accounts') {
      const query: any = {
        eq: jest.fn((column: string) =>
          column === 'active'
            ? Promise.resolve({ data: [{ id: 'acc-a' }], error: null })
            : query
        ),
      };
      return { select: jest.fn(() => query) };
    }
    if (table === 'transactions') {
      const query: any = {
        in: jest.fn(() => query),
        eq: jest.fn(() => query),
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: [
              { id: 'tx-out', account_id: 'acc-a', transfer_id: 'tr-1' },
              { id: 'tx-in', account_id: 'acc-a', transfer_id: 'tr-1' },
            ],
            error: null,
          }),
      };
      return { select: jest.fn(() => query) };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { client: { from, rpc } as any, rpc };
}

describe('SupabaseTransfersRepository.delete (#119)', () => {
  it('deletes an owned transfer with one atomic RPC call', async () => {
    const { client, rpc } = makeClient({ error: null });

    await new SupabaseTransfersRepository(client).delete('user-1', 'tr-1');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('delete_transfer', {
      p_transfer_id: 'tr-1',
    });
  });

  it('surfaces the database error and does not report success', async () => {
    const { client } = makeClient({ error: { message: 'Transfer not found' } });

    await expect(
      new SupabaseTransfersRepository(client).delete('user-1', 'tr-1')
    ).rejects.toThrow('Failed to delete transfer: Transfer not found');
  });
});
