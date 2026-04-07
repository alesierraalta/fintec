import { GET } from '@/app/api/trends/route';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { currencyService } from '@/lib/services/currency-service';

jest.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/services/currency-service', () => ({
  currencyService: {
    getBinanceTrends: jest.fn(),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('trends route', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<
    typeof getAuthenticatedUser
  >;
  const mockGetBinanceTrends =
    currencyService.getBinanceTrends as jest.MockedFunction<
      typeof currencyService.getBinanceTrends
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue('user-1');
  });

  it('returns trends payload or empty object fallback', async () => {
    mockGetBinanceTrends.mockResolvedValueOnce({ usd_ves: [1, 2] } as any);
    mockGetBinanceTrends.mockResolvedValueOnce(undefined as any);

    const first = await GET(new Request('http://localhost/api/trends') as any);
    const second = await GET(new Request('http://localhost/api/trends') as any);

    expect(first.status).toBe(200);
    expect((await first.json()).data).toEqual({ usd_ves: [1, 2] });
    expect((await second.json()).data).toEqual({});
  });

  it('returns 401 for auth failures and 500 for service failures', async () => {
    mockGetAuthenticatedUser.mockRejectedValueOnce(
      new Error('No authorization token provided')
    );
    mockGetAuthenticatedUser.mockResolvedValueOnce('user-1');
    mockGetBinanceTrends.mockRejectedValueOnce(new Error('upstream offline'));

    const unauthorized = await GET(
      new Request('http://localhost/api/trends') as any
    );
    const failure = await GET(
      new Request('http://localhost/api/trends') as any
    );

    expect(unauthorized.status).toBe(401);
    expect(failure.status).toBe(500);
  });
});
