import {
  BinanceP2POffersService,
  formatBinanceP2PTransAmount,
} from '@/lib/server/binance-p2p-offers';
import type { BinanceP2POffersQuery } from '@/types/binance-p2p-offers';

function createRawOffer(
  overrides: {
    adv?: Record<string, unknown>;
    advertiser?: Record<string, unknown>;
  } = {}
) {
  return {
    adv: {
      advNo: 'fixture-offer-a',
      tradeType: 'SELL',
      asset: 'USDT',
      fiatUnit: 'VES',
      price: '125.37',
      minSingleTransAmount: '500000.00',
      maxSingleTransAmount: '1500000.00',
      dynamicMaxSingleTransAmount: '1200000.00',
      surplusAmount: '9000.00000000',
      tradableQuantity: '7999.12340000',
      tradeMethods: [
        {
          identifier: 'PagoMovil',
          payType: 'PagoMovil',
          tradeMethodName: 'Fixture payment',
        },
      ],
      payTimeLimit: 15,
      assetScale: 8,
      fiatScale: 2,
      priceScale: 2,
      isTradable: true,
      ...overrides.adv,
    },
    advertiser: {
      nickName: 'Fixture Merchant',
      userNo: 's-fixture-user-no',
      monthOrderCount: 48,
      monthFinishRate: '0.9876',
      positiveRate: '0.9912',
      ...overrides.advertiser,
    },
  };
}

function createResponse(data: unknown[], status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue({ data }),
  } as unknown as Response;
}

const baseQuery: BinanceP2POffersQuery = {
  side: 'BUY',
  amountMinor: 100_000_000,
  amountUnit: 'VES',
  paymentMethod: 'PagoMovil',
};

describe('BinanceP2POffersService', () => {
  it('sends the verified payload and maps exact values while dropping non-matches', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      createResponse([
        createRawOffer(),
        createRawOffer({
          adv: { advNo: 'fixture-malformed', price: '125.379' },
        }),
        createRawOffer({
          adv: {
            advNo: 'fixture-outside-limit',
            maxSingleTransAmount: '900000.00',
            dynamicMaxSingleTransAmount: '900000.00',
          },
        }),
        createRawOffer({
          adv: {
            advNo: 'fixture-wrong-payment',
            tradeMethods: [{ identifier: 'Banesco', payType: 'Banesco' }],
          },
        }),
      ])
    );
    const service = new BinanceP2POffersService({
      fetcher,
      now: () => Date.parse('2026-07-16T12:00:00.000Z'),
      retryDelayMs: 0,
    });

    const result = await service.search(baseQuery);

    expect(result.status).toBe('live');
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0]).toMatchObject({
      id: 'fixture-offer-a',
      advertiserSide: 'SELL',
      priceMinor: 12_537,
      minFiatMinor: 50_000_000,
      maxFiatMinor: 120_000_000,
      availableQuantity: { value: '7999.12340000', scale: 8 },
      payTimeLimitMinutes: 15,
      merchant: {
        nickname: 'Fixture Merchant',
        userNo: 's-fixture-user-no',
        monthOrderCount: 48,
        monthCompletionRateBps: 9_876,
      },
    });

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
    );
    expect(JSON.parse(init.body as string)).toEqual({
      page: 1,
      rows: 20,
      payTypes: ['PagoMovil'],
      countries: [],
      publisherType: null,
      asset: 'USDT',
      fiat: 'VES',
      tradeType: 'BUY',
      transAmount: '1000000.00',
      proMerchantAds: false,
    });
    expect(formatBinanceP2PTransAmount(123_456)).toBe('1234.56');
  });

  it('deduplicates the same in-flight query and separates exact cache keys', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(createResponse([createRawOffer()]))
      .mockResolvedValueOnce(
        createResponse([
          createRawOffer({
            adv: { advNo: 'fixture-offer-b', price: '126.00' },
          }),
        ])
      );
    const service = new BinanceP2POffersService({ fetcher, retryDelayMs: 0 });

    const [first, duplicate] = await Promise.all([
      service.search(baseQuery),
      service.search(baseQuery),
    ]);
    const differentQuery = {
      ...baseQuery,
      amountMinor: baseQuery.amountMinor + 100,
    };
    const second = await service.search(differentQuery);
    const cachedFirst = await service.search(baseQuery);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(duplicate).toBe(first);
    expect(cachedFirst.offers[0].priceMinor).toBe(12_537);
    expect(second.offers[0].priceMinor).toBe(12_600);
  });

  it('filters USDT quantity against availability and fiat limits', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      createResponse([
        createRawOffer({
          adv: {
            minSingleTransAmount: '500.00',
            maxSingleTransAmount: '1500000.00',
            dynamicMaxSingleTransAmount: '1200000.00',
          },
        }),
        createRawOffer({
          adv: {
            advNo: 'fixture-too-small',
            tradableQuantity: '900.00',
          },
        }),
      ])
    );
    const service = new BinanceP2POffersService({ fetcher, retryDelayMs: 0 });

    const result = await service.search({
      side: 'BUY',
      amountMinor: 100_000,
      amountUnit: 'USDT',
      paymentMethod: 'PagoMovil',
    });

    expect(result.status).toBe('live');
    expect(result.offers.map((offer) => offer.id)).toEqual(['fixture-offer-a']);
    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ transAmount: '' });
  });

  it('filters offers by minimum completion rate and order count', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      createResponse([
        createRawOffer({
          advertiser: {
            monthOrderCount: 120,
            monthFinishRate: '0.995',
          },
        }),
        createRawOffer({
          adv: { advNo: 'fixture-low-quality' },
        }),
      ])
    );
    const service = new BinanceP2POffersService({ fetcher, retryDelayMs: 0 });

    const result = await service.search({
      ...baseQuery,
      minCompletionRateBps: 9_900,
      minOrderCount: 100,
    });

    expect(result.offers.map((offer) => offer.id)).toEqual(['fixture-offer-a']);
  });

  it('requests full pages sequentially, preserves distinct ads, and never requests page four', async () => {
    const page = Array.from({ length: 20 }, (_, index) =>
      createRawOffer({
        adv: { advNo: `page-one-${index}` },
        advertiser: { userNo: 'same-seller' },
      })
    );
    const pageTwo = [
      createRawOffer({ adv: { advNo: 'page-one-0' } }),
      ...Array.from({ length: 19 }, (_, index) =>
        createRawOffer({
          adv: { advNo: `page-two-${index}` },
          advertiser: { userNo: 'same-seller' },
        })
      ),
    ];
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(createResponse(page))
      .mockResolvedValueOnce(createResponse(pageTwo))
      .mockResolvedValueOnce(
        createResponse([
          createRawOffer({
            adv: { advNo: 'page-three-only' },
            advertiser: { userNo: 'same-seller' },
          }),
        ])
      );
    const service = new BinanceP2POffersService({ fetcher, retryDelayMs: 0 });

    const result = await service.search(baseQuery);
    const bodies = fetcher.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string)
    );

    expect(bodies.map((body) => body.page)).toEqual([1, 2, 3]);
    expect(
      bodies.every(
        (body) => body.rows === 20 && body.payTypes.includes('PagoMovil')
      )
    ).toBe(true);
    expect(bodies.some((body) => body.page === 4)).toBe(false);
    expect(result.offers).toHaveLength(40);
    expect(result.offers.map((offer) => offer.id)).toContain('page-three-only');
    expect(
      result.offers.filter((offer) => offer.merchant.userNo === 'same-seller')
    ).toHaveLength(40);
  });

  it('stops after a short page and retries only the failed page', async () => {
    const fullPage = Array.from({ length: 20 }, (_, index) =>
      createRawOffer({ adv: { advNo: `full-${index}` } })
    );
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(createResponse(fullPage))
      .mockResolvedValueOnce(createResponse([], 503))
      .mockResolvedValueOnce(createResponse([], 200));
    const service = new BinanceP2POffersService({ fetcher, retryDelayMs: 0 });

    const result = await service.search(baseQuery);
    const pages = fetcher.mock.calls.map(
      ([, init]) => JSON.parse((init as RequestInit).body as string).page
    );

    expect(result.status).toBe('live');
    expect(pages).toEqual([1, 2, 2]);
    expect(result.offers).toHaveLength(20);
  });

  it('fails closed on a later page and returns same-query stale data when seeded', async () => {
    let now = Date.parse('2026-07-16T12:00:00.000Z');
    const fullPage = Array.from({ length: 20 }, (_, index) =>
      createRawOffer({ adv: { advNo: `seed-${index}` } })
    );
    const fetcher = jest.fn().mockResolvedValue(createResponse(fullPage));
    const service = new BinanceP2POffersService({
      fetcher,
      now: () => now,
      retryDelayMs: 0,
    });
    const seeded = await service.search(baseQuery);
    now += 31_000;
    fetcher.mockReset().mockResolvedValue(createResponse([], 400));

    const result = await service.search(baseQuery);

    expect(seeded.status).toBe('live');
    expect(result).toMatchObject({ status: 'stale', offers: seeded.offers });
    expect(result.offers).not.toHaveLength(0);
  });

  it('returns unavailable without a successful prefix when page two fails without stale data', async () => {
    const fullPage = Array.from({ length: 20 }, (_, index) =>
      createRawOffer({ adv: { advNo: `prefix-${index}` } })
    );
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(createResponse(fullPage))
      .mockResolvedValueOnce(createResponse([], 400));
    const service = new BinanceP2POffersService({ fetcher, retryDelayMs: 0 });

    await expect(service.search(baseQuery)).resolves.toMatchObject({
      status: 'unavailable',
      offers: [],
      fetchedAt: null,
    });
  });

  it('sends native USDT payload units and rejects malformed page data fail-closed', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        createResponse({ invalid: true } as unknown as unknown[])
      );
    const service = new BinanceP2POffersService({ fetcher, retryDelayMs: 0 });

    const result = await service.search({
      ...baseQuery,
      amountMinor: 1005,
      amountUnit: 'USDT',
    });
    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];

    expect(JSON.parse(init.body as string)).toMatchObject({ transAmount: '' });
    expect(result.query.amountUnit).toBe('USDT');
    expect(result).toMatchObject({ status: 'unavailable', offers: [] });
  });

  it('serves only same-query stale data and never fabricates an unavailable result', async () => {
    let now = Date.parse('2026-07-16T12:00:00.000Z');
    const fetcher = jest
      .fn()
      .mockResolvedValue(createResponse([createRawOffer()]));
    const service = new BinanceP2POffersService({
      fetcher,
      now: () => now,
      retryDelayMs: 0,
    });

    const live = await service.search(baseQuery);
    now += 31_000;
    fetcher.mockReset().mockRejectedValue(new Error('network unavailable'));

    const stale = await service.search(baseQuery);
    const unavailable = await service.search({
      ...baseQuery,
      paymentMethod: 'Banesco',
    });

    expect(live.status).toBe('live');
    expect(stale.status).toBe('stale');
    expect(stale.offers).toEqual(live.offers);
    expect(unavailable).toMatchObject({
      status: 'unavailable',
      offers: [],
      fetchedAt: null,
    });
  });
});
