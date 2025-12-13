import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';

// Mock global fetch
global.fetch = jest.fn();

describe('Binance Scraper Fallback Logic', () => {
  jest.setTimeout(15000); // Increase timeout

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fallback to USDT rates when BUSD returns no data', async () => {
    // Mock fetch implementation to return different data based on asset
    (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      if (!options || !options.body) {
        return { ok: false };
      }

      const body = JSON.parse(options.body as string);
      const asset = body.asset;

      // valid response structure
      const validResponse = {
        data: [
          { adv: { price: '100', advNo: '1' } },
          { adv: { price: '102', advNo: '2' } },
        ]
      };

      // empty response for BUSD
      const emptyResponse = { data: [] };

      if (asset === 'USDT') {
        return {
          ok: true,
          json: async () => validResponse
        };
      } else if (asset === 'BUSD') {
        return {
          ok: true,
          json: async () => emptyResponse
        };
      }

      return { ok: false };
    });

    const result = await scrapeBinanceRates();

    expect(result.success).toBe(true);
    expect(result.data.usdt_ves).toBe(101); // (100 + 102) / 2
    expect(result.data.busd_ves).toBe(101); // Should equal USDT avg because BUSD failed
    
    // Verify source indicates normal operation (not fallback source, but internal fallback logic)
    // The source string "Binance P2P" stays the same in _transformData, 
    // but the value is what we care about.
  });

  it('should use BUSD rates when available', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body as string);
      const asset = body.asset;

      if (asset === 'USDT') {
        return {
          ok: true,
          json: async () => ({
            data: [{ adv: { price: '100', advNo: '1' } }]
          })
        };
      } else if (asset === 'BUSD') {
        return {
          ok: true,
          json: async () => ({
            data: [{ adv: { price: '200', advNo: '2' } }]
          })
        };
      }
      return { ok: false };
    });

    const result = await scrapeBinanceRates();

    expect(result.success).toBe(true);
    expect(result.data.usdt_ves).toBe(100);
    expect(result.data.busd_ves).toBe(200); // Should be distinct
  });
});
