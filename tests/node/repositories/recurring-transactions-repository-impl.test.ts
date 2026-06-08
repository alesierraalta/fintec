import { LocalRecurringTransactionsRepository } from '@/repositories/local/recurring-transactions-repository-impl';
import { SupabaseRecurringTransactionsRepository } from '@/repositories/supabase/recurring-transactions-repository-impl';

describe('LocalRecurringTransactionsRepository executeDue', () => {
  let repository: LocalRecurringTransactionsRepository;

  beforeEach(() => {
    repository = new LocalRecurringTransactionsRepository();
  });

  it('should execute a due transaction and return a mock transaction ID', async () => {
    const mockId = 'rec-tx-123';
    const result = await repository.executeDue(
      mockId,
      10000,
      1.0,
      '2026-06-08',
      '2026-07-08',
      'user-1'
    );
    expect(result).toBe('mock-transaction-id');
  });
});

describe('SupabaseRecurringTransactionsRepository executeDue', () => {
  let mockSupabaseClient: any;
  let repository: SupabaseRecurringTransactionsRepository;

  beforeEach(() => {
    mockSupabaseClient = {
      rpc: jest.fn(),
    };
    repository = new SupabaseRecurringTransactionsRepository(mockSupabaseClient);
  });

  it('should call execute_due_recurring_transaction RPC with correct parameters', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: 'new-tx-uuid',
      error: null,
    });

    const result = await repository.executeDue(
      'recurring-id',
      50000,
      36.5,
      '2026-06-08',
      '2026-07-08',
      'user-1'
    );

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'execute_due_recurring_transaction',
      {
        p_recurring_transaction_id: 'recurring-id',
        p_amount_base_minor: 50000,
        p_exchange_rate: 36.5,
        p_execution_date: '2026-06-08',
        p_next_execution_date: '2026-07-08',
      }
    );
    expect(result).toBe('new-tx-uuid');
  });

  it('should throw an error if the RPC call fails', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database constraint failed' },
    });

    await expect(
      repository.executeDue(
        'recurring-id',
        50000,
        36.5,
        '2026-06-08',
        '2026-07-08',
        'user-1'
      )
    ).rejects.toThrow('Failed to execute recurring transaction: Database constraint failed');
  });
});
