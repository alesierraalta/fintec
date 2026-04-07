import { POST, PUT } from '@/app/api/auth/profile/route';
import { createClient } from '@/lib/supabase/server';
import {
  createServerAppRepository,
  createServerUsersProfileRepository,
} from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
  createServerUsersProfileRepository: jest.fn(),
}));

describe('auth profile route handlers', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;
  const mockCreateServerUsersProfileRepository =
    createServerUsersProfileRepository as jest.MockedFunction<
      typeof createServerUsersProfileRepository
    >;

  const notifications = { create: jest.fn() };
  const usersProfileRepository = {
    upsert: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              user_metadata: { name: 'Meta Name' },
            },
          },
          error: null,
        }),
      },
    } as any);
    mockCreateServerAppRepository.mockReturnValue({ notifications } as any);
    mockCreateServerUsersProfileRepository.mockReturnValue(
      usersProfileRepository as any
    );
  });

  it('upserts profile and creates welcome notifications when requested', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Ada',
          baseCurrency: 'EUR',
          createWelcomeNotifications: true,
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(usersProfileRepository.upsert).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Ada',
      baseCurrency: 'EUR',
    });
    expect(notifications.create).toHaveBeenCalledTimes(3);
  });

  it('falls back to metadata-derived defaults on profile bootstrap', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(usersProfileRepository.upsert).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Meta Name',
      baseCurrency: 'USD',
    });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    const postResponse = await POST(
      new Request('http://localhost/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as any
    );
    const putResponse = await PUT(
      new Request('http://localhost/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({}),
      }) as any
    );

    expect(postResponse.status).toBe(401);
    expect(putResponse.status).toBe(401);
  });

  it('updates mutable profile and subscription fields', async () => {
    const response = await PUT(
      new Request('http://localhost/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Ada Updated',
          baseCurrency: 'VES',
          tier: 'pro',
          subscription_status: 'active',
          subscription_tier: 'premium',
          subscription_id: 'sub-1',
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(usersProfileRepository.update).toHaveBeenCalledWith('user-1', {
      name: 'Ada Updated',
      baseCurrency: 'VES',
      tier: 'pro',
      subscriptionStatus: 'active',
      subscriptionTier: 'premium',
      subscriptionId: 'sub-1',
    });
  });

  it('returns 500 when repository operations fail', async () => {
    usersProfileRepository.upsert.mockRejectedValueOnce(
      new Error('upsert failed')
    );
    usersProfileRepository.update.mockRejectedValueOnce(
      new Error('update failed')
    );

    const postResponse = await POST(
      new Request('http://localhost/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as any
    );
    const putResponse = await PUT(
      new Request('http://localhost/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({}),
      }) as any
    );

    expect(postResponse.status).toBe(500);
    expect(putResponse.status).toBe(500);
  });
});
