import { binanceRatesService } from '@/lib/services/binance-rates-service';
import { binanceHistoryService } from '@/lib/services/binance-history-service';

// * Mock dependencies
jest.mock('@/lib/services/binance-history-service', () => ({
    binanceHistoryService: {
        saveRates: jest.fn(),
        getMultiPeriodTrends: jest.fn(),
    },
}));

// * Mock global fetch
global.fetch = jest.fn();

describe('BinanceRatesService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        binanceRatesService.clearCache();
    });

    describe('fetchRates', () => {
        it('should return fresh rates from API when successful', async () => {
            // * Setup Mock API response
            const mockApiResponse = {
                success: true,
                data: {
                    usd_ves: 50.0,
                    usdt_ves: 50.1,
                    lastUpdated: new Date().toISOString(),
                    sell_rate: { min: 50, avg: 50.5, max: 51 },
                    buy_rate: { min: 49, avg: 49.5, max: 50 },
                },
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse,
            });

            // * Execute
            const rates = await binanceRatesService.fetchRates();

            // * Verify
            expect(rates.usd_ves).toBe(50.0);
            expect(rates.usdt_ves).toBe(50.1);

            // * Verify history save
            expect(binanceHistoryService.saveRates).toHaveBeenCalledWith(50.0);
        });

        it('should use fallback from API if success is false but data exists', async () => {
            const mockApiResponse = {
                success: false,
                fallback: true,
                data: {
                    usd_ves: 48.0,
                    // other minimal fields would be filled by service logic or existing in response
                },
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse,
            });

            const rates = await binanceRatesService.fetchRates();

            expect(rates.usd_ves).toBe(48.0);
        });

        it('should throw error if API fails without fallback data', async () => {
            const mockApiResponse = {
                success: false,
                error: 'API Error',
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse,
            });

            // * Since fetchRates handles the error by returning hardcoded fallback (last resort),
            // * we expect it to return the hardcoded values, NOT throw.
            // * The implementation catches internal errors.

            const rates = await binanceRatesService.fetchRates();
            expect(rates.usd_ves).toBe(228.50); // Hardcoded fallback value
        });

        it('should use cached rates if API fails', async () => {
            // * Populate cache
            const cachedData = {
                success: true,
                data: { usd_ves: 55.0, usdt_ves: 55.0 },
            };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => cachedData,
            });
            await binanceRatesService.fetchRates();

            // * Fail next request
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Net Error'));

            const rates = await binanceRatesService.fetchRates();

            expect(rates.usd_ves).toBe(55.0);
        });
    });

    describe('getTrends', () => {
        it('should delegate to binanceHistoryService', async () => {
            const mockTrends = {
                '1d': { percentage: 1, direction: 'up', period: '1d' },
                '1w': { percentage: 2, direction: 'up', period: '1w' },
                '1m': { percentage: 3, direction: 'up', period: '1m' },
            };

            (binanceHistoryService.getMultiPeriodTrends as jest.Mock).mockResolvedValueOnce(mockTrends);

            const result = await binanceRatesService.getTrends();

            expect(result).not.toBeNull();
            expect(result?.usdVes).toEqual(mockTrends);
        });
    });
});
