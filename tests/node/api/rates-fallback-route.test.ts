describe('BCV and Binance rate routes', () => {
  const scrapeBCVRates = jest.fn();
  const buildBCVFallbackData = jest.fn();
  const scrapeBinanceRates = jest.fn();
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('@/lib/scrapers/bcv-scraper', () => ({
      scrapeBCVRates,
    }));
    jest.doMock('@/lib/services/rates-fallback', () => ({
      buildBCVFallbackData,
    }));
    jest.doMock('@/lib/scrapers/binance-scraper', () => ({
      scrapeBinanceRates,
    }));
    jest.doMock('@/lib/utils/logger', () => ({ logger }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves cached BCV success data and POST mirrors GET', async () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    scrapeBCVRates.mockResolvedValue({
      success: true,
      data: { usd_ves: 36, source: 'BCV' },
    });

    const route = await import('@/app/api/bcv-rates/route');
    const first = await route.GET();
    now = 2000;
    const second = await route.GET();
    const post = await route.POST();

    expect(first.status).toBe(200);
    expect((await second.json()).cached).toBe(true);
    expect(scrapeBCVRates).toHaveBeenCalledTimes(1);
    expect(post.status).toBe(200);
  });

  it('falls back to last known good and static BCV fallback', async () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    scrapeBCVRates
      .mockResolvedValueOnce({
        success: true,
        data: { usd_ves: 36, source: 'BCV' },
        circuitBreakerState: 'closed',
      })
      .mockResolvedValueOnce({
        success: false,
        error: 'scraper failed',
        circuitBreakerState: 'open',
      });
    buildBCVFallbackData.mockReturnValue({ usd_ves: 30, source: 'static' });

    const route = await import('@/app/api/bcv-rates/route');
    await route.GET();
    now = 200000;
    const fallbackFromCache = await route.GET();

    expect((await fallbackFromCache.json()).fallback).toBe(true);

    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('@/lib/scrapers/bcv-scraper', () => ({
      scrapeBCVRates: jest.fn().mockRejectedValue(new Error('boom')),
    }));
    jest.doMock('@/lib/services/rates-fallback', () => ({
      buildBCVFallbackData: jest
        .fn()
        .mockReturnValue({ usd_ves: 30, source: 'static' }),
    }));
    const freshRoute = await import('@/app/api/bcv-rates/route');
    const staticFallback = await freshRoute.GET();
    const body = await staticFallback.json();

    expect(body.fallback).toBe(true);
    expect(body.data.source).toBe('static');
  });

  it('returns Binance success payloads and POST mirrors GET', async () => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    scrapeBinanceRates.mockResolvedValue({
      success: true,
      data: { prices_used: 2, source: 'Binance' },
    });

    const route = await import('@/app/api/binance-rates/route');
    const first = await route.GET();
    const second = await route.GET();
    const post = await route.POST();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(post.status).toBe(200);
    expect(scrapeBinanceRates.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('falls back on Binance scraper failures', async () => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
    scrapeBinanceRates.mockResolvedValue({
      success: false,
      error: '429 Too Many Requests',
    });

    const route = await import('@/app/api/binance-rates/route');
    const response = await route.GET();
    const body = await response.json();

    expect(body.fallback).toBe(true);
    expect(body.success).toBe(false);

    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('@/lib/scrapers/binance-scraper', () => ({
      scrapeBinanceRates: jest.fn().mockRejectedValue(new Error('hard fail')),
    }));
    jest.doMock('@/lib/utils/logger', () => ({ logger }));
    const freshRoute = await import('@/app/api/binance-rates/route');
    const hardFallback = await freshRoute.GET();
    const hardBody = await hardFallback.json();

    expect(hardBody.fallback).toBe(true);
    expect(hardBody.success).toBe(false);
  });
});
