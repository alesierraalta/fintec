import { GET } from '@/app/api/transactions/route';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

describe('GET /api/transactions', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
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

  it('applies SQL-level limit in unfiltered query', async () => {
    const findAll = jest
      .fn()
      .mockResolvedValue([{ id: 'tx-1' }, { id: 'tx-2' }]);
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        findAll,
      },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/transactions?limit=2') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findAll).toHaveBeenCalledWith(2);
    expect(body.count).toBe(2);
  });

  it('forwards limit as pagination when filtering by account', async () => {
    const findByAccountId = jest.fn().mockResolvedValue({
      data: [{ id: 'tx-1' }],
      total: 8,
    });
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        findByAccountId,
      },
    } as any);

    const response = await GET(
      new Request(
        'http://localhost/api/transactions?accountId=acc-1&limit=5'
      ) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findByAccountId).toHaveBeenCalledWith('acc-1', {
      page: 1,
      limit: 5,
    });
    expect(body.totalCount).toBe(8);
  });

  it('returns 400 for invalid limit values', async () => {
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        findAll: jest.fn(),
      },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/transactions?limit=0') as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('limit must be a positive integer');
  });
});
