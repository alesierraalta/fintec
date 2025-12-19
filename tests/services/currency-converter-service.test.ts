import { currencyConverterService } from '@/lib/services/currency-converter-service';
import { bcvRatesService } from '@/lib/services/bcv-rates-service';

// * Mock dependencies
jest.mock('@/lib/services/bcv-rates-service', () => ({
    bcvRatesService: {
        fetchRates: jest.fn(),
        getCachedRates: jest.fn(),
    },
}));

describe('CurrencyConverterService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        currencyConverterService.clearCache();
    });

    describe('fetchExchangeRates', () => {
        it('should fetch and cache rates correctly', async () => {
            const mockBcvRates = {
                usd: 50.0,
                eur: 55.0,
                lastUpdated: new Date().toISOString(),
                source: 'BCV',
            };
            (bcvRatesService.fetchRates as jest.Mock).mockResolvedValueOnce(mockBcvRates);

            const rates = await currencyConverterService.fetchExchangeRates();

            expect(rates).toHaveLength(1);
            expect(rates[0].currency).toBe('VES');
            expect(rates[0].rate).toBe(50.0);

            // * Verify cache
            expect(currencyConverterService.getExchangeRate('VES')?.rate).toBe(50.0);
        });

        it('should use fallback if fetch fails', async () => {
            (bcvRatesService.fetchRates as jest.Mock).mockRejectedValueOnce(new Error('Fetch Error'));
            (bcvRatesService.getCachedRates as jest.Mock).mockReturnValue(null);

            const rates = await currencyConverterService.fetchExchangeRates();

            expect(rates).toHaveLength(1);
            expect(rates[0].source).toBe('Fallback');
        });
    });

    describe('convertCurrency', () => {
        beforeEach(() => {
            // * Seed cache for conversion tests
            currencyConverterService.setExchangeRate('VES', 50.0); // 1 USD = 50 VES
            currencyConverterService.setExchangeRate('EUR', 0.9);  // 1 USD = 0.9 EUR
            // Implicitly USD is base, so 1 USD = 1 USD (conceptually for the converter logic if we had logic for USD)
            // actually the logic is: usdAmount = amount / fromRate.rate
            // so we need rate relative to USD.
            // If VES rate is 50, it means 1 USD = 50 VES.
            // If EUR rate is 0.9, it means 1 USD = 0.9 EUR.
            currencyConverterService.setExchangeRate('USD', 1.0);
        });

        it('should convert VES to USD correctly', () => {
            // 100 VES -> ? USD
            // 100 / 50 * 1 = 2 USD
            const result = currencyConverterService.convertCurrency(100, 'VES', 'USD');
            expect(result).toBe(2.0);
        });

        it('should convert USD to VES correctly', () => {
            // 10 USD -> ? VES
            // 10 / 1 * 50 = 500 VES
            const result = currencyConverterService.convertCurrency(10, 'USD', 'VES');
            expect(result).toBe(500.0);
        });

        it('should convert VES to EUR correctly', () => {
            // 100 VES -> ? EUR
            // 100 / 50 * 0.9 = 1.8 EUR
            const result = currencyConverterService.convertCurrency(100, 'VES', 'EUR');
            expect(result).toBe(1.8);
        });

        it('should return same amount if currencies are same', () => {
            const result = currencyConverterService.convertCurrency(100, 'VES', 'VES');
            expect(result).toBe(100);
        });

        it('should throw error for unknown currency', () => {
            expect(() => currencyConverterService.convertCurrency(100, 'VES', 'XYZ'))
                .toThrow('Exchange rate not found');
        });
    });
});
