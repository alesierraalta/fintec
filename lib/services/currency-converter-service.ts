/**
 * Currency Converter Service
 * Handles currency conversion and exchange rate management
 * Extracted from currency-service.ts as part of Phase 3 refactoring
 */

import { bcvRatesService } from './bcv-rates-service';
import { STATIC_BCV_FALLBACK_RATES } from './rates-fallback';
import { logger } from '@/lib/utils/logger';

/**
 * Exchange rate interface for internal use
 */
export interface ExchangeRate {
    currency: string;
    rate: number;
    lastUpdated: string;
    source: string;
}

class CurrencyConverterService {
    private static instance: CurrencyConverterService;
    private exchangeRates: Map<string, ExchangeRate> = new Map();

    private constructor() { }

    static getInstance(): CurrencyConverterService {
        if (!CurrencyConverterService.instance) {
            CurrencyConverterService.instance = new CurrencyConverterService();
        }
        return CurrencyConverterService.instance;
    }

    /**
     * Fetch exchange rates from BCV API
     * @param baseCurrency - Base currency for conversion (default: 'USD')
     * @returns Promise<ExchangeRate[]>
     */
    async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRate[]> {
        try {
            // * Use BCV rates for VES and fallback rates for others
            const bcvRates = await bcvRatesService.fetchRates();

            const rates: ExchangeRate[] = [
                {
                    currency: 'VES',
                    rate: bcvRates.usd,
                    lastUpdated: bcvRates.lastUpdated,
                    source: bcvRates.source || 'BCV',
                },
            ];

            rates.forEach(rate => {
                this.exchangeRates.set(rate.currency, rate);
            });

            return rates;
        } catch (error) {
            logger.error('[CurrencyConverterService] Error fetching exchange rates:', error);

            // * Return minimal fallback
            const cachedBcvRates = bcvRatesService.getCachedRates();
            const lastUpdated = cachedBcvRates?.lastUpdated || new Date().toISOString();

            return [
                {
                    currency: 'VES',
                    rate: cachedBcvRates?.usd ?? STATIC_BCV_FALLBACK_RATES.usd,
                    lastUpdated,
                    source: 'Fallback',
                },
            ];
        }
    }

    /**
     * Convert amount between currencies
     * @param amount - Amount to convert
     * @param fromCurrency - Source currency code
     * @param toCurrency - Target currency code
     * @returns Converted amount
     * @throws Error if amount is invalid or exchange rates not found
     */
    convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
        if (!Number.isFinite(amount)) {
            throw new Error(`Invalid amount for conversion: ${amount}`);
        }

        if (fromCurrency === toCurrency) return amount;

        const fromRate = this.exchangeRates.get(fromCurrency);
        const toRate = this.exchangeRates.get(toCurrency);

        if (!fromRate || !toRate) {
            throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
        }

        // * Convert to USD first, then to target currency
        const usdAmount = amount / fromRate.rate;
        return usdAmount * toRate.rate;
    }

    /**
     * Get cached exchange rate for a currency
     * @param currency - Currency code
     * @returns ExchangeRate | null
     */
    getExchangeRate(currency: string): ExchangeRate | null {
        return this.exchangeRates.get(currency) || null;
    }

    /**
     * Get all cached exchange rates
     * @returns Map<string, ExchangeRate>
     */
    getAllExchangeRates(): Map<string, ExchangeRate> {
        return new Map(this.exchangeRates);
    }

    /**
     * Clear cached exchange rates
     */
    clearCache(): void {
        this.exchangeRates.clear();
    }

    /**
     * Set exchange rate manually (useful for testing)
     * @param currency - Currency code
     * @param rate - Exchange rate
     * @param source - Source of the rate
     */
    setExchangeRate(currency: string, rate: number, source: string = 'Manual'): void {
        this.exchangeRates.set(currency, {
            currency,
            rate,
            lastUpdated: new Date().toISOString(),
            source,
        });
    }
}

export const currencyConverterService = CurrencyConverterService.getInstance();
export { CurrencyConverterService };
