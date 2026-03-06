import { getUserUsage } from '@/lib/supabase/subscriptions';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('getUserUsage', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns monthly transaction usage from SQL count', async () => {
    const usageLte = jest.fn().mockResolvedValue({ count: 37, error: null });
    const usageGte = jest.fn().mockReturnValue({ lte: usageLte });
    const usageIn = jest.fn().mockReturnValue({ gte: usageGte });
    const usageSelect = jest.fn().mockReturnValue({ in: usageIn });

    const accountsEq = jest.fn().mockResolvedValue({
      data: [{ id: 'acc-1' }, { id: 'acc-2' }],
      error: null,
    });
    const accountsSelect = jest.fn().mockReturnValue({ eq: accountsEq });

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        return { select: accountsSelect };
      }

      if (table === 'transactions') {
        return { select: usageSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from } as any);

    const usage = await getUserUsage('user-123');

    expect(from).toHaveBeenCalledWith('accounts');
    expect(accountsSelect).toHaveBeenCalledWith('id');
    expect(accountsEq).toHaveBeenCalledWith('user_id', 'user-123');

    expect(from).toHaveBeenCalledWith('transactions');
    expect(usageSelect).toHaveBeenCalledWith('id', {
      count: 'exact',
      head: true,
    });
    expect(usageIn).toHaveBeenCalledWith('account_id', ['acc-1', 'acc-2']);
    expect(usageGte).toHaveBeenCalledWith(
      'date',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    expect(usageLte).toHaveBeenCalledWith(
      'date',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    expect(usage.transactionCount).toBe(37);
  });

  it('returns zero usage when user has no owned accounts', async () => {
    const usageSelect = jest.fn();
    const accountsEq = jest.fn().mockResolvedValue({ data: [], error: null });
    const accountsSelect = jest.fn().mockReturnValue({ eq: accountsEq });

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        return { select: accountsSelect };
      }

      if (table === 'transactions') {
        return { select: usageSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from } as any);

    const usage = await getUserUsage('user-123');

    expect(usage).toEqual({
      transactionCount: 0,
      backupCount: 0,
      exportCount: 0,
      apiCalls: 0,
      aiRequests: 0,
    });
    expect(usageSelect).not.toHaveBeenCalled();
  });

  it('falls back safely when usage query fails', async () => {
    const usageLte = jest
      .fn()
      .mockResolvedValue({ count: null, error: { message: 'boom' } });
    const usageGte = jest.fn().mockReturnValue({ lte: usageLte });
    const usageIn = jest.fn().mockReturnValue({ gte: usageGte });
    const usageSelect = jest.fn().mockReturnValue({ in: usageIn });

    const accountsEq = jest
      .fn()
      .mockResolvedValue({ data: [{ id: 'acc-1' }], error: null });
    const accountsSelect = jest.fn().mockReturnValue({ eq: accountsEq });

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        return { select: accountsSelect };
      }

      if (table === 'transactions') {
        return { select: usageSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from } as any);

    const usage = await getUserUsage('user-123');

    expect(usage).toEqual({
      transactionCount: 0,
      backupCount: 0,
      exportCount: 0,
      apiCalls: 0,
      aiRequests: 0,
    });
  });
});
