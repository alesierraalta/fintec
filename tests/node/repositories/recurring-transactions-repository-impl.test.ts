import { LocalRecurringTransactionsRepository } from '@/repositories/local/recurring-transactions-repository-impl';
import { SupabaseRecurringTransactionsRepository } from '@/repositories/supabase/recurring-transactions-repository-impl';

describe('LocalRecurringTransactionsRepository executeDue', () => {
  let repository: LocalRecurringTransactionsRepository;

  beforeEach(() => {
    repository = new LocalRecurringTransactionsRepository();
  });

  it('should reject executeDue honestly instead of returning a fabricated transaction ID', async () => {
    await expect(
      repository.executeDue(
        'rec-tx-123',
        10000,
        1.0,
        '2026-06-08',
        '2026-07-08',
        'user-1'
      )
    ).rejects.toThrow(
      'Recurring transactions not supported in local repository'
    );
  });
});

describe('LocalRecurringTransactionsRepository create explicit dates', () => {
  let repository: LocalRecurringTransactionsRepository;

  beforeEach(() => {
    repository = new LocalRecurringTransactionsRepository();
  });

  it('should reject create explicitly instead of silently claiming success', async () => {
    await expect(
      repository.create(
        {
          name: 'Rent',
          type: 'EXPENSE',
          accountId: 'acc-1',
          currencyCode: 'USD',
          amountMinor: 120000,
          frequency: 'monthly',
          startDate: '2026-06-01',
        },
        'user-1'
      )
    ).rejects.toThrow(
      'Recurring transactions not supported in local repository'
    );
  });
});

describe('SupabaseRecurringTransactionsRepository executeDue', () => {
  let mockSupabaseClient: any;
  let repository: SupabaseRecurringTransactionsRepository;

  beforeEach(() => {
    mockSupabaseClient = {
      rpc: jest.fn(),
    };
    repository = new SupabaseRecurringTransactionsRepository(
      mockSupabaseClient
    );
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
    ).rejects.toThrow(
      'Failed to execute recurring transaction: Database constraint failed'
    );
  });

  it('should not fabricate a duplicate execution when the RPC already executed the rule', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: 'existing-tx-uuid',
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

    // The repository must return the existing execution id verbatim rather than
    // inventing a new one: the RPC's atomic lock is the duplicate-free boundary.
    expect(result).toBe('existing-tx-uuid');
  });
});

describe('SupabaseRecurringTransactionsRepository create with explicit dates', () => {
  let mockSupabaseClient: any;
  let repository: SupabaseRecurringTransactionsRepository;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(),
    };
    repository = new SupabaseRecurringTransactionsRepository(
      mockSupabaseClient
    );
  });

  it('should persist the explicitly computed nextExecutionDate when provided', async () => {
    const selectChain = {
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'rec-1',
          user_id: 'user-1',
          name: 'Rent',
          type: 'EXPENSE',
          account_id: 'acc-1',
          currency_code: 'USD',
          amount_minor: 120000,
          frequency: 'monthly',
          interval_count: 1,
          start_date: '2026-06-01',
          end_date: null,
          next_execution_date: '2026-07-01',
          is_active: true,
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-01T00:00:00.000Z',
          description: null,
          note: null,
          tags: null,
          last_executed_at: null,
        },
        error: null,
      }),
    };
    const insertChain = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue(selectChain),
      }),
    };
    mockSupabaseClient.from.mockReturnValue(insertChain);

    const result = await repository.create(
      {
        name: 'Rent',
        type: 'EXPENSE',
        accountId: 'acc-1',
        currencyCode: 'USD',
        amountMinor: 120000,
        frequency: 'monthly',
        startDate: '2026-06-01',
        nextExecutionDate: '2026-07-01',
      },
      'user-1'
    );

    expect(mockSupabaseClient.from).toHaveBeenCalledWith(
      'recurring_transactions'
    );
    // The insert payload must carry the explicit next_execution_date, not startDate.
    expect(insertChain.insert).toHaveBeenCalledTimes(1);
    const insertPayload = (insertChain.insert as jest.Mock).mock.calls[0][0];
    expect(insertPayload.next_execution_date).toBe('2026-07-01');
    expect(insertPayload.start_date).toBe('2026-06-01');
    expect(result.nextExecutionDate).toBe('2026-07-01');
  });
});
