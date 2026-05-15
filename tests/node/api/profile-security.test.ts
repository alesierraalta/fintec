import { PUT } from '@/app/api/auth/profile/route';
import { createClient } from '@/lib/supabase/server';
import { createServerUsersProfileRepository } from '@/repositories/factory';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerUsersProfileRepository: jest.fn(),
}));

describe('Profile Security Integration', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServerUsersProfileRepository = createServerUsersProfileRepository as jest.MockedFunction<
    typeof createServerUsersProfileRepository
  >;

  const usersProfileRepository = {
    update: jest.fn(),
  };

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
    mockCreateServerUsersProfileRepository.mockReturnValue(usersProfileRepository as any);
  });

  it('should ignore non-profile fields when allowed profile fields are present', async () => {
    const request = new NextRequest('http://localhost/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Valid Name',
        tier: 'premium',
        subscription_tier: 'premium',
        subscription_id: 'sub-1',
      }),
    });

    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(usersProfileRepository.update).toHaveBeenCalledWith('user-1', {
      name: 'Valid Name',
    });
  });

  it('should reject payloads with only non-profile fields', async () => {
    const request = new NextRequest('http://localhost/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        subscription_tier: 'premium',
        planOverride: { tier: 'enterprise' },
      }),
    });

    const response = await PUT(request);

    expect(response.status).toBe(400);
    expect(usersProfileRepository.update).not.toHaveBeenCalled();
  });

  it('should allow updating normal fields like name', async () => {
    const request = new NextRequest('http://localhost/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Valid Name',
      }),
    });

    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(usersProfileRepository.update).toHaveBeenCalledWith('user-1', {
      name: 'Valid Name',
    });
  });
});
