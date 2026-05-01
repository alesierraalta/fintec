import { GET } from '@/app/api/binance-rates/route';
import { NextResponse } from 'next/server';

jest.mock('@/lib/services/exchange-rate-db', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getLatestExchangeRate: jest.fn().mockResolvedValue({
        usd_ves: 632.95,
        usdt_ves: 632.95,
        sell_rate: 632.95,
        buy_rate: 631.5,
        lastUpdated: new Date().toISOString(),
        source: 'Reconstructed (History Fallback)',
      }),
    };
  });
});

describe('Binance Rates Route Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with fallback data when only reconstructed history exists', async () => {
    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    // We have to extract JSON from the NextResponse object
    const responseData = await response.json();

    expect(responseData.success).toBe(true);
    expect(responseData.fallback).toBe(true);
    expect(responseData.fromBackground).toBe(false);
    expect(responseData.data.usd_ves).toBe(632.95);
    expect(responseData.data.source).toBe('Reconstructed (History Fallback)');
  });
});
