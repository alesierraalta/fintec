// Special handling for Venezuelan Bolívar (VES) with BCV rates
import { Money, CURRENCIES } from './money';
import type { Currency } from '@/types/domain';

export interface BCVRates {
  usd: number;
  eur: number;
  lastUpdated: string;
}

// Helper to validate VES operations against BCV rates
export class VESCurrency {
  private static bcvRates: BCVRates | null = null;
  
  // Set BCV rates (should be called from hooks/context)
  static setBCVRates(rates: BCVRates) {
    this.bcvRates = rates;
  }
  
  // Get current BCV rates
  static getBCVRates(): BCVRates | null {
    return this.bcvRates;
  }
  
  // Format VES amount with proper BCV context
  static formatVES(amountMinor: number, options?: {
    showUSDEquivalent?: boolean;
    locale?: string;
  }): string {
    const { showUSDEquivalent = false, locale = 'es-VE' } = options || {};
    
    const vesMoney = Money.fromMinor(amountMinor, 'VES');
    const formatted = vesMoney.format({ locale });
    
    if (showUSDEquivalent && this.bcvRates) {
      const usdEquivalent = vesMoney.getMajorAmount() / this.bcvRates.usd;
      return `${formatted} (~$${usdEquivalent.toFixed(2)})`;
    }
    
    return formatted;
  }
  
  // Convert VES to USD using BCV rates
  static convertVESToUSD(vesAmountMinor: number): number {
    if (!this.bcvRates) {
      throw new Error('BCV rates not available for VES conversion');
    }
    
    const vesMajor = Money.fromMinor(vesAmountMinor, 'VES').getMajorAmount();
    return vesMajor / this.bcvRates.usd;
  }
  
  // Convert USD to VES using BCV rates
  static convertUSDToVES(usdAmount: number): number {
    if (!this.bcvRates) {
      throw new Error('BCV rates not available for USD to VES conversion');
    }
    
    const vesAmount = usdAmount * this.bcvRates.usd;
    return Money.fromMajor(vesAmount, 'VES').getMinorAmount();
  }
  
  // Validate VES amount against reasonable bounds
  static validateVESAmount(amountMinor: number): boolean {
    const majorAmount = Money.fromMinor(amountMinor, 'VES').getMajorAmount();
    
    // Reasonable bounds for VES amounts (adjust as needed)
    const minAmount = 0.01; // 1 céntimo
    const maxAmount = 100000000; // 100 million bolívars
    
    return majorAmount >= minAmount && majorAmount <= maxAmount;
  }
  
  // Get VES currency info with BCV context
  static getVESInfo(): Currency & { bcvRate?: number; lastUpdated?: string } {
    const currency = CURRENCIES.VES;
    return {
      ...currency,
      bcvRate: this.bcvRates?.usd,
      lastUpdated: this.bcvRates?.lastUpdated,
    };
  }
}

// Utility function to check if a currency requires BCV validation
export function requiresBCVValidation(currencyCode: string): boolean {
  return CURRENCIES[currencyCode]?.requiresBCVRate === true;
}

// Enhanced formatting function that handles VES specially
export function formatCurrencyWithBCV(
  amountMinor: number, 
  currencyCode: string, 
  options?: {
    showUSDEquivalent?: boolean;
    locale?: string;
  }
): string {
  if (currencyCode === 'VES') {
    return VESCurrency.formatVES(amountMinor, options);
  }
  
  return Money.fromMinor(amountMinor, currencyCode).format(options);
}
