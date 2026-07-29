const mockSearch = jest.fn();
const mockRateLimit = jest.fn();

jest.mock('@/lib/server/binance-p2p-offers', () => ({
  binanceP2POffersService: { search: mockSearch },
}));

jest.mock('@/lib/server/binance-p2p-offers-rate-limiter', () => ({
  checkBinanceP2POffersRateLimit: mockRateLimit,
}));

import { POST } from '@/app/api/binance-p2p-offers/route';

function createRequest(body: unknown, headers?: Record<string, string>) {
  return new Request('http://localhost/api/binance-p2p-offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/binance-p2p-offers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    });
  });

  it('rejects invalid filters before calling the offers service', async () => {
    const response = await POST(
      createRequest({
        side: 'BUY',
        amountMinor: 99,
        paymentMethod: 'PagoMovil',
      })
    );

    expect(response.status).toBe(400);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('returns Retry-After when the public IP limit is exceeded', async () => {
    mockRateLimit.mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
      resetAt: Date.now() + 5_000,
    });

    const response = await POST(
      createRequest(
        { side: 'BUY', amountMinor: 100, paymentMethod: 'ALL' },
        { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }
      )
    );

    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThanOrEqual(
      1
    );
    expect(mockRateLimit).toHaveBeenCalledWith('203.0.113.10');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('forwards a valid strict query and exposes unavailable semantics as 503', async () => {
    const query = {
      side: 'SELL',
      amountMinor: 100_000,
      paymentMethod: 'Mercantil',
    } as const;
    mockSearch.mockResolvedValue({
      status: 'unavailable',
      query,
      offers: [],
      fetchedAt: null,
    });

    const response = await POST(createRequest(query));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unavailable');
    expect(mockSearch).toHaveBeenCalledWith(query);
  });
});
