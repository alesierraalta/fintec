import { useBinanceRates } from './use-binance-rates';
import { useMemo, useCallback } from 'react';

/**
 * Hook for currency conversion between different currencies
 * Uses Binance rates for VES conversions
 */
export function useCurrencyConverter() {
  const { rates, loading, error } = useBinanceRates();
  
  /**
   * Convert amount from one currency to another
   * @param amountMinor - Amount in minor units (cents)
   * @param fromCurrency - Source currency code (USD, VES, etc.)
   * @param toCurrency - Target currency code (default: USD)
   * @returns Converted amount in major units
   */
  const convert = useCallback((
    amountMinor: number, 
    fromCurrency: string, 
    toCurrency: string = 'USD'
  ): number => {
    // Same currency, just convert to major units
    if (fromCurrency === toCurrency) {
      return amountMinor / 100;
    }
    
    // Convert from minor units first
    const amount = amountMinor / 100;
    
    // VES to USD
    if (fromCurrency === 'VES' && toCurrency === 'USD') {
      return amount / rates.usd_ves;
    }
    
    // USD to VES
    if (fromCurrency === 'USD' && toCurrency === 'VES') {
      return amount * rates.usd_ves;
    }
    
    // EUR conversions (using approximate rate)
    if (fromCurrency === 'EUR' && toCurrency === 'USD') {
      return amount * 1.1; // Approximate EUR to USD
    }
    
    if (fromCurrency === 'USD' && toCurrency === 'EUR') {
      return amount / 1.1; // Approximate USD to EUR
    }
    
    // Default: return original amount if conversion not supported
    return amount;
  }, [rates]);
  
  /**
   * Convert any amount to USD for comparison
   */
  const convertToUSD = useCallback((amountMinor: number, fromCurrency: string): number => {
    return convert(amountMinor, fromCurrency, 'USD');
  }, [convert]);
  
  /**
   * Get exchange rate between two currencies
   */
  const getRate = useCallback((fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;
    
    if (fromCurrency === 'VES' && toCurrency === 'USD') {
      return 1 / rates.usd_ves;
    }
    
    if (fromCurrency === 'USD' && toCurrency === 'VES') {
      return rates.usd_ves;
    }
    
    return 1;
  }, [rates]);
  
  return { 
    convert, 
    convertToUSD, 
    getRate,
    rates, 
    loading, 
    error 
  };
}

