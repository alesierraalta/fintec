import { BinanceRatesService } from '@/lib/services/binance-rates-service';

describe('BinanceRatesService 503 Fix Verification', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    // Force reset private singleton state for isolation
    const service = BinanceRatesService.getInstance();
    (service as any).cachedRates = null;
    (service as any).cachedAt = 0;
    (service as any).inFlightFetch = null;
  });

  it('handles 404 by falling back to hardcoded defaults (new behavior)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ success: false, error: 'No data' }),
    });

    const service = BinanceRatesService.getInstance();
    const rates = await service.fetchRates();
    expect(rates.usd_ves).toBe(228.5);
  });

  it('successfully parses 200 response with fallback: true from API', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            usd_ves: 632.95,
            usdt_ves: 632.95,
            sell_rate: 632.95,
            buy_rate: 631.5,
            lastUpdated: new Date().toISOString(),
            source: 'Reconstructed (History Fallback)',
          },
          fallback: true,
        }),
    });

    const service = BinanceRatesService.getInstance();

    const rates = await service.fetchRates();
    expect(rates.usd_ves).toBe(632.95);
  });
});
