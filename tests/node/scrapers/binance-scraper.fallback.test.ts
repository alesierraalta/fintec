import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';

// Mock global fetch
global.fetch = jest.fn();

describe('Binance Scraper Fallback Logic', () => {
  jest.setTimeout(15000); // Increase timeout

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call fetch exactly twice (only USDT SELL and BUY) and map BUSD 1:1 to USDT', async () => {
    // Mock fetch implementation to return valid USDT data
    (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      if (!options || !options.body) {
        return { ok: false };
      }

      const body = JSON.parse(options.body as string);
      const asset = body.asset;
      const tradeType = body.tradeType;

      if (asset !== 'USDT') {
        throw new Error(`Unexpected asset fetch: ${asset}`);
      }

      const price = tradeType === 'SELL' ? '772.0' : '768.0';

      return {
        ok: true,
        json: async () => ({
          data: [
            { adv: { price, advNo: '1' } }
          ]
        })
      };
    });

    const result = await scrapeBinanceRates();

    expect(result.success).toBe(true);
    // Verify fetch was called exactly twice (once for SELL, once for BUY)
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Verify assets requested in calls
    const calls = (global.fetch as jest.Mock).mock.calls;
    const body1 = JSON.parse(calls[0][1].body);
    const body2 = JSON.parse(calls[1][1].body);

    expect(body1.asset).toBe('USDT');
    expect(body2.asset).toBe('USDT');

    // Verify rates
    expect(result.data.usdt_ves).toBe(770); // (772 + 768) / 2
    expect(result.data.busd_ves).toBe(770); // Should equal USDT avg 1:1
    expect(result.data.sell_rate).toBe(772);
    expect(result.data.buy_rate).toBe(768);
  });

  it('should handle timeout/network errors by returning static fallback rates in 770 range', async () => {
    // Mock fetch to simulate error or timeout
    (global.fetch as jest.Mock).mockImplementation(async () => {
      throw new Error('Timeout or network failure');
    });

    const result = await scrapeBinanceRates();

    expect(result.success).toBe(false);
    expect(result.data).toBeDefined();
    // Verify it uses updated fallback rates in ~770 range
    expect(result.data.usd_ves).toBe(770.0);
    expect(result.data.usdt_ves).toBe(770.0);
    expect(result.data.busd_ves).toBe(770.0);
    expect(result.data.sell_rate).toBe(771.0);
    expect(result.data.buy_rate).toBe(769.0);
  });
});
