/**
 * Currency Service - Facade Pattern
 * Coordinates specialized currency services and provides unified API
 * Refactored from God Object (491 lines) to Facade pattern as part of Phase 3
 */

import type { BCVRates, BinanceRates } from '@/types/rates';
import { bcvRatesService } from './bcv-rates-service';
import { binanceRatesService } from './binance-rates-service';
import { cryptoPricesService, type CryptoPrice } from './crypto-prices-service';
import { currencyConverterService, type ExchangeRate } from './currency-converter-service';
import { formatCurrency, getSupportedCurrencies } from './currency-formatter';
import type { BCVTrend } from './bcv-history-service';
import type { BinanceTrend } from './binance-history-service';

/**
 * Currency Service - Main facade for all currency operations
 * Delegates to specialized services for specific functionality
 */
class CurrencyService {
  private static instance: CurrencyService;

  private constructor() { }

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  // ==================== BCV Rates ====================

  /**
   * Fetch BCV rates (Banco Central de Venezuela)
   * @returns Promise<BCVRates>
   */
  async fetchBCVRates(): Promise<BCVRates> {
    return bcvRatesService.fetchRates();
  }

  /**
   * Get cached BCV rates
   * @returns BCVRates | null
   */
  getBCVRates(): BCVRates | null {
    return bcvRatesService.getCachedRates();
  }

  /**
   * Get BCV trends (requires rates to be saved in history)
   * @returns Promise<{ usd: BCVTrend; eur: BCVTrend } | null>
   */
  async getBCVTrends(): Promise<{ usd: BCVTrend; eur: BCVTrend } | null> {
    return bcvRatesService.getTrends();
  }

  // ==================== Binance Rates ====================

  /**
   * Fetch Binance P2P rates
   * @returns Promise<BinanceRates>
   */
  async fetchBinanceRates(): Promise<BinanceRates> {
    return binanceRatesService.fetchRates();
  }

  /**
   * Get cached Binance rates
   * @returns BinanceRates | null
   */
  getBinanceRates(): BinanceRates | null {
    return binanceRatesService.getCachedRates();
  }

  /**
   * Get Binance trends
   * @returns Promise<{ usdVes: { '1d': BinanceTrend; '1w': BinanceTrend; '1m': BinanceTrend } } | null>
   */
  async getBinanceTrends(): Promise<{ usdVes: { '1d': BinanceTrend; '1w': BinanceTrend; '1m': BinanceTrend } } | null> {
    return binanceRatesService.getTrends();
  }

  // ==================== Crypto Prices ====================

  /**
   * Get cryptocurrency prices
   * @param symbols - Array of crypto symbols (default: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'])
   * @returns Promise<CryptoPrice[]>
   */
  async fetchCryptoPrices(symbols: string[] = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL']): Promise<CryptoPrice[]> {
    return cryptoPricesService.fetchPrices(symbols);
  }

  /**
   * Get cached crypto price
   * @param symbol - Crypto symbol
   * @returns CryptoPrice | null
   */
  getCryptoPrice(symbol: string): CryptoPrice | null {
    return cryptoPricesService.getCachedPrice(symbol);
  }

  // ==================== Currency Conversion ====================

  /**
   * Get fiat exchange rates from BCV API
   * @param baseCurrency - Base currency (default: 'USD')
   * @returns Promise<ExchangeRate[]>
   */
  async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRate[]> {
    return currencyConverterService.fetchExchangeRates(baseCurrency);
  }

  /**
   * Convert amount between currencies
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Converted amount
   */
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    return currencyConverterService.convertCurrency(amount, fromCurrency, toCurrency);
  }

  /**
   * Get cached exchange rate
   * @param currency - Currency code
   * @returns ExchangeRate | null
   */
  getExchangeRate(currency: string): ExchangeRate | null {
    return currencyConverterService.getExchangeRate(currency);
  }

  // ==================== Formatting & Utilities ====================

  /**
   * Format currency display
   * @param amount - Amount to format
   * @param currency - Currency code
   * @param locale - Locale for formatting (default: 'en-US')
   * @returns Formatted currency string
   */
  formatCurrency(amount: number, currency: string, locale: string = 'en-US'): string {
    return formatCurrency(amount, currency, locale);
  }

  /**
   * Get supported currencies
   * @returns Object with fiat and crypto arrays
   */
  getSupportedCurrencies(): { fiat: string[]; crypto: string[] } {
    return getSupportedCurrencies();
  }

  // ==================== Cache Management ====================

  /**
   * Clear all caches (useful for testing or forcing refresh)
   */
  clearAllCaches(): void {
    bcvRatesService.clearCache();
    binanceRatesService.clearCache();
    cryptoPricesService.clearCache();
    currencyConverterService.clearCache();
  }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();
export { CurrencyService };

// Re-export types for convenience
export type { BCVRates, BinanceRates, CryptoPrice, ExchangeRate, BCVTrend, BinanceTrend };
