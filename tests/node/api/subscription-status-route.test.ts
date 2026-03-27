import { GET } from '@/app/api/subscription/status/route';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionStatusPayload } from '@/lib/supabase/subscriptions';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/subscriptions', () => ({
  getSubscriptionStatusPayload: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('subscription status route', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockGetSubscriptionStatusPayload =
    getSubscriptionStatusPayload as jest.MockedFunction<
      typeof getSubscriptionStatusPayload
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as any);
  });

  it('returns payload for authenticated users', async () => {
    mockGetSubscriptionStatusPayload.mockResolvedValue({
      tier: 'premium',
    } as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ tier: 'premium' });
  });

  it('returns 401 when user is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('returns 500 when payload lookup fails', async () => {
    mockGetSubscriptionStatusPayload.mockRejectedValue(
      new Error('lookup failed')
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('lookup failed');
  });
});
