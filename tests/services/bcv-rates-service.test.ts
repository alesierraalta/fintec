import { bcvRatesService } from '@/lib/services/bcv-rates-service';
import { bcvHistoryService } from '@/lib/services/bcv-history-service';
import { STATIC_BCV_FALLBACK_RATES } from '@/lib/services/rates-fallback';

// * Mock dependencies
jest.mock('@/lib/services/bcv-history-service', () => ({
    bcvHistoryService: {
        getLatestRate: jest.fn(),
        saveRates: jest.fn(),
        calculateTrends: jest.fn(),
    },
}));

// * Mock global fetch
global.fetch = jest.fn();

describe('BCVRatesService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        bcvRatesService.clearCache();
    });

    describe('fetchRates', () => {
        it('should return fresh rates from API when successful', async () => {
            // * Setup Mock API response
            const mockApiResponse = {
                data: {
                    usd: 45.5,
                    eur: 48.2,
                    source: 'BCV',
                    lastUpdated: new Date().toISOString(),
                },
                success: true,
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponse,
            });

            // * Execute
            const rates = await bcvRatesService.fetchRates();

            // * Verify
            expect(rates.usd).toBe(45.5);
            expect(rates.eur).toBe(48.2);
            expect(rates.source).toBe('BCV');
            expect(rates.fallback).toBeUndefined();

            // * Verify cache was updated
            expect(bcvRatesService.getCachedRates()).toEqual(expect.objectContaining({
                usd: 45.5,
                eur: 48.2,
            }));

            // * Verify fetch was called correctly
            expect(global.fetch).toHaveBeenCalledWith('/api/bcv-rates', expect.objectContaining({
                method: 'GET',
            }));

            // * Verify history save attempted
            expect(bcvHistoryService.saveRates).toHaveBeenCalledWith(45.5, 48.2, 'BCV');
        });

        it('should use cached rates if available and API fails', async () => {
            // * Setup initial cache
            const cachedRates = {
                usd: 40.0,
                eur: 42.0,
                lastUpdated: new Date().toISOString(),
                source: 'BCV',
            };

            // * Pre-populate cache by successfully fetching once (or mocking internal state if possible, but let's use the public API)
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: cachedRates, success: true }),
            });
            await bcvRatesService.fetchRates();

            // * Now mock API failure
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            // * Execute
            const rates = await bcvRatesService.fetchRates();

            // * Verify
            expect(rates.usd).toBe(40.0);
            expect(rates.source).toContain('cache');
            expect(rates.cached).toBe(true);
            expect(rates.fallback).toBe(true);
        });

        it('should fallback to history if API fails and no cache', async () => {
            // * Mock API failure
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            // * Mock history service response
            const historyRate = {
                usd: 39.5,
                eur: 41.5,
                timestamp: new Date().toISOString(),
                source: 'Binance', // History might serve different sources, just testing flow
            };
            (bcvHistoryService.getLatestRate as jest.Mock).mockResolvedValueOnce(historyRate);

            // * Ensure indexedDB is "present" for the check
            (global as any).indexedDB = {};

            // * Execute
            const rates = await bcvRatesService.fetchRates();

            // * Verify
            expect(rates.usd).toBe(39.5);
            expect(rates.source).toContain('history');
            expect(rates.fallback).toBe(true);
            expect(rates.fallbackReason).toBe('history');
        });

        it('should use static fallback as last resort', async () => {
            // * Mock API failure
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            // * Mock history failure/empty
            (bcvHistoryService.getLatestRate as jest.Mock).mockResolvedValueOnce(null);

            // * Ensure indexedDB is "present"
            (global as any).indexedDB = {};

            // * Execute
            const rates = await bcvRatesService.fetchRates();

            // * Verify
            expect(rates.usd).toBe(STATIC_BCV_FALLBACK_RATES.usd);
            expect(rates.source).toContain('static');
            expect(rates.fallback).toBe(true);
            expect(rates.fallbackReason).toBe('static');
        });
    });

    describe('getTrends', () => {
        it('should delegate to bcvHistoryService', async () => {
            const mockTrends = {
                usd: { percentage: 1.5, direction: 'up', period: '7d' },
                eur: { percentage: 0.5, direction: 'stable', period: '7d' },
            };
            (bcvHistoryService.calculateTrends as jest.Mock).mockResolvedValueOnce(mockTrends);

            const trends = await bcvRatesService.getTrends();

            expect(trends).toEqual(mockTrends);
            expect(bcvHistoryService.calculateTrends).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            (bcvHistoryService.calculateTrends as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const trends = await bcvRatesService.getTrends();

            expect(trends).toBeNull();
        });
    });
});
