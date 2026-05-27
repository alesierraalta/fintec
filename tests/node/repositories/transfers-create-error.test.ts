import { SupabaseTransfersRepository } from '@/repositories/supabase/transfers-repository-impl';

describe('SupabaseTransfersRepository create() schema error handling', () => {
  it('throws actionable message when PostgREST schema is stale', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Node cannot be found in the current page' },
    });

    const repository = new SupabaseTransfersRepository({ rpc } as any);

    await expect(
      repository.create('user-1', {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amountMajor: 100,
      })
    ).rejects.toThrow(
      'create_transfer RPC is not available — check that the migration was applied and PostgREST schema is up to date'
    );
  });

  it('preserves original error message for non-schema failures', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Source account not found' },
    });

    const repository = new SupabaseTransfersRepository({ rpc } as any);

    await expect(
      repository.create('user-1', {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amountMajor: 100,
      })
    ).rejects.toThrow('Source account not found');
  });

  it('preserves original error message for insufficient balance', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Insufficient balance' },
    });

    const repository = new SupabaseTransfersRepository({ rpc } as any);

    await expect(
      repository.create('user-1', {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amountMajor: 100,
      })
    ).rejects.toThrow('Insufficient balance');
  });

  it('handles error without message gracefully', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: {},
    });

    const repository = new SupabaseTransfersRepository({ rpc } as any);

    await expect(
      repository.create('user-1', {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amountMajor: 100,
      })
    ).rejects.toThrow('Failed to create transfer');
  });
});
