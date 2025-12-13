import { currencyService, BCVRates, BinanceRates } from '@/lib/services/currency-service';
import { bcvHistoryService } from '@/lib/services/bcv-history-service';
import { binanceHistoryService } from '@/lib/services/binance-history-service';
import { STATIC_BCV_FALLBACK_RATES } from '@/lib/services/rates-fallback';

// Mock the entire bcvHistoryService module
jest.mock('@/lib/services/bcv-history-service', () => ({
  bcvHistoryService: {
    getLatestRate: jest.fn(),
    saveRates: jest.fn(),
    getMultiPeriodTrends: jest.fn(),
  },
}));

// Mock the entire binanceHistoryService module
jest.mock('@/lib/services/binance-history-service', () => ({
  binanceHistoryService: {
    saveRates: jest.fn(),
    getMultiPeriodTrends: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('CurrencyService Methods', () => {
  let spyOnGetLatestRate: jest.SpyInstance;
  let spyOnSaveRates: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state
    (currencyService as any).bcvRates = null;
    (currencyService as any).binanceRates = null;
    // Mock indexedDB for history fallback tests
    (globalThis as any).indexedDB = { open: jest.fn(), deleteDatabase: jest.fn() };

    // Spy on actual bcvHistoryService methods
    spyOnGetLatestRate = jest.spyOn(bcvHistoryService, 'getLatestRate');
    spyOnSaveRates = jest.spyOn(bcvHistoryService, 'saveRates');
  });

  afterEach(() => {
    spyOnGetLatestRate.mockRestore();
    spyOnSaveRates.mockRestore();
  });

  describe('fetchBCVRates', () => {
    it('should return API rates when fetch is successful', async () => {
      const mockResponse = {
        success: true,
        data: {
          usd: 40.5,
          eur: 42.5,
          lastUpdated: new Date().toISOString(),
          source: 'BCV',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const rates = await currencyService.fetchBCVRates();

      expect(rates.usd).toBe(40.5);
      expect(rates.eur).toBe(42.5);
      expect(rates.source).toBe('BCV');
      expect(spyOnSaveRates).toHaveBeenCalledWith(40.5, 42.5, 'BCV');
    });

    it('should use history fallback if API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Down'));

      const mockHistory = { usd: 39.0, eur: 41.0, timestamp: new Date().toISOString() };
      spyOnGetLatestRate.mockResolvedValueOnce(mockHistory);

      const rates = await currencyService.fetchBCVRates();

      expect(rates.usd).toBe(39.0);
      expect(rates.source).toContain('history');
    });

    it('should use static fallback if API and history fail', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Down'));
      spyOnGetLatestRate.mockResolvedValueOnce(null); // Use spyOn

      const rates = await currencyService.fetchBCVRates();

      expect(rates.usd).toBe(STATIC_BCV_FALLBACK_RATES.usd);
      expect(rates.source).toContain('static');
    });

    it('should handle API error response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      spyOnGetLatestRate.mockResolvedValueOnce(null); // Use spyOn

      const rates = await currencyService.fetchBCVRates();
      expect(rates.source).toContain('static');
    });
  });

  describe('fetchBinanceRates', () => {
    it('should return API rates when successful', async () => {
      const mockResponse = {
        success: true,
        data: {
          usd_ves: 45.0,
          usdt_ves: 45.0,
          busd_ves: 45.0,
          sell_rate: {
            min: 44.9,
            avg: 45.0,
            max: 45.1
          },
          buy_rate: {
            min: 44.8,
            avg: 44.9,
            max: 45.0
          },
          lastUpdated: new Date().toISOString(),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const rates = await currencyService.fetchBinanceRates();

      expect(rates.usd_ves).toBe(45.0);
      expect(binanceHistoryService.saveRates).toHaveBeenCalledWith(45.0);
    });

    it('should handle fallback if API returns fallback flag', async () => {
      const mockResponse = {
        fallback: true,
        data: {
          usd_ves: 44.0,
          usdt_ves: 44.0,
          busd_ves: 44.0,
          sell_rate: {
            min: 43.9,
            avg: 44.0,
            max: 44.1
          },
          buy_rate: {
            min: 43.8,
            avg: 43.9,
            max: 44.0
          },
          lastUpdated: new Date().toISOString(),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const rates = await currencyService.fetchBinanceRates();
      expect(rates.usd_ves).toBe(44.0);
      // It should NOT throw
    });

    it('should use hardcoded fallback if API throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const rates = await currencyService.fetchBinanceRates();

      expect(rates.usd_ves).toBeGreaterThan(0); // Should use hardcoded fallback
      // Ensure hardcoded values are present
      expect(rates.sell_rate.avg).toBeDefined();
    });
  });
});
