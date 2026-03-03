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
    const lte = jest.fn().mockResolvedValue({ count: 37, error: null });
    const gte = jest.fn().mockReturnValue({ lte });
    const eq = jest.fn().mockReturnValue({ gte });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });

    mockCreateClient.mockResolvedValue({ from } as any);

    const usage = await getUserUsage('user-123');

    expect(from).toHaveBeenCalledWith('transactions');
    expect(select).toHaveBeenCalledWith('id, accounts!inner(user_id)', {
      count: 'exact',
      head: true,
    });
    expect(eq).toHaveBeenCalledWith('accounts.user_id', 'user-123');
    expect(gte).toHaveBeenCalledWith(
      'date',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    expect(lte).toHaveBeenCalledWith(
      'date',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    expect(usage.transactionCount).toBe(37);
  });

  it('falls back safely when usage query fails', async () => {
    const lte = jest
      .fn()
      .mockResolvedValue({ count: null, error: { message: 'boom' } });
    const gte = jest.fn().mockReturnValue({ lte });
    const eq = jest.fn().mockReturnValue({ gte });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });

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
