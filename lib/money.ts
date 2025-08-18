// Money utility functions for handling currency amounts in minor units
// This prevents floating-point arithmetic errors

import { Currency } from '@/types';

// Common currencies with their decimal places
export const CURRENCIES: Record<string, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimals: 2 },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimals: 2 },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimals: 0 },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', decimals: 0 },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2 },
};

export class Money {
  private readonly amountMinor: number;
  private readonly currency: Currency;

  constructor(amountMinor: number, currencyCode: string) {
    this.amountMinor = Math.round(amountMinor);
    this.currency = CURRENCIES[currencyCode] || {
      code: currencyCode,
      symbol: currencyCode,
      name: currencyCode,
      decimals: 2,
    };
  }

  // Create from major units (e.g., dollars)
  static fromMajor(amount: number, currencyCode: string): Money {
    const currency = CURRENCIES[currencyCode] || { code: currencyCode, symbol: currencyCode, name: currencyCode, decimals: 2 };
    const amountMinor = Math.round(amount * Math.pow(10, currency.decimals));
    return new Money(amountMinor, currencyCode);
  }

  // Create from minor units (e.g., cents)
  static fromMinor(amountMinor: number, currencyCode: string): Money {
    return new Money(amountMinor, currencyCode);
  }

  // Get amount in minor units
  getMinorAmount(): number {
    return this.amountMinor;
  }

  // Get amount in major units
  getMajorAmount(): number {
    return this.amountMinor / Math.pow(10, this.currency.decimals);
  }

  // Get currency info
  getCurrency(): Currency {
    return this.currency;
  }

  // Add money (must be same currency)
  add(other: Money): Money {
    if (this.currency.code !== other.currency.code) {
      throw new Error('Cannot add different currencies without exchange rate');
    }
    return new Money(this.amountMinor + other.amountMinor, this.currency.code);
  }

  // Subtract money (must be same currency)
  subtract(other: Money): Money {
    if (this.currency.code !== other.currency.code) {
      throw new Error('Cannot subtract different currencies without exchange rate');
    }
    return new Money(this.amountMinor - other.amountMinor, this.currency.code);
  }

  // Multiply by a number
  multiply(factor: number): Money {
    return new Money(Math.round(this.amountMinor * factor), this.currency.code);
  }

  // Divide by a number
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Money(Math.round(this.amountMinor / divisor), this.currency.code);
  }

  // Check if amount is zero
  isZero(): boolean {
    return this.amountMinor === 0;
  }

  // Check if amount is positive
  isPositive(): boolean {
    return this.amountMinor > 0;
  }

  // Check if amount is negative
  isNegative(): boolean {
    return this.amountMinor < 0;
  }

  // Get absolute value
  abs(): Money {
    return new Money(Math.abs(this.amountMinor), this.currency.code);
  }

  // Negate amount
  negate(): Money {
    return new Money(-this.amountMinor, this.currency.code);
  }

  // Compare with another Money object
  equals(other: Money): boolean {
    return this.currency.code === other.currency.code && this.amountMinor === other.amountMinor;
  }

  // Compare amounts (must be same currency)
  compare(other: Money): number {
    if (this.currency.code !== other.currency.code) {
      throw new Error('Cannot compare different currencies without exchange rate');
    }
    return this.amountMinor - other.amountMinor;
  }

  // Format as string
  format(options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    locale?: string;
  }): string {
    const {
      showSymbol = true,
      showCode = false,
      locale = 'es-ES',
    } = options || {};

    const amount = this.getMajorAmount();
    
    let formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: this.currency.decimals,
      maximumFractionDigits: this.currency.decimals,
    }).format(amount);

    if (showSymbol) {
      formatted = `${this.currency.symbol}${formatted}`;
    }

    if (showCode) {
      formatted = `${formatted} ${this.currency.code}`;
    }

    return formatted;
  }

  // Convert to different currency using exchange rate
  convertTo(targetCurrencyCode: string, exchangeRate: number): Money {
    if (this.currency.code === targetCurrencyCode) {
      return this;
    }

    const targetCurrency = CURRENCIES[targetCurrencyCode] || {
      code: targetCurrencyCode,
      symbol: targetCurrencyCode,
      name: targetCurrencyCode,
      decimals: 2,
    };

    // Convert to major units, apply exchange rate, then to minor units
    const majorAmount = this.getMajorAmount();
    const convertedMajorAmount = majorAmount * exchangeRate;
    const convertedMinorAmount = Math.round(convertedMajorAmount * Math.pow(10, targetCurrency.decimals));

    return new Money(convertedMinorAmount, targetCurrencyCode);
  }

  // Allocate amount proportionally (useful for splitting bills)
  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      throw new Error('Ratios array cannot be empty');
    }

    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (totalRatio === 0) {
      throw new Error('Total ratio cannot be zero');
    }

    const results: Money[] = [];
    let remainder = this.amountMinor;

    for (let i = 0; i < ratios.length; i++) {
      const allocation = Math.floor((this.amountMinor * ratios[i]) / totalRatio);
      results.push(new Money(allocation, this.currency.code));
      remainder -= allocation;
    }

    // Distribute remainder to first results
    for (let i = 0; i < remainder; i++) {
      const currentAmount = results[i % results.length].getMinorAmount();
      results[i % results.length] = new Money(currentAmount + 1, this.currency.code);
    }

    return results;
  }

  // Create zero amount
  static zero(currencyCode: string): Money {
    return new Money(0, currencyCode);
  }

  // Create from string (e.g., "123.45")
  static fromString(amountStr: string, currencyCode: string): Money {
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: ${amountStr}`);
    }
    return Money.fromMajor(amount, currencyCode);
  }

  // Convert to JSON
  toJSON(): { amountMinor: number; currencyCode: string } {
    return {
      amountMinor: this.amountMinor,
      currencyCode: this.currency.code,
    };
  }

  // Create from JSON
  static fromJSON(data: { amountMinor: number; currencyCode: string }): Money {
    return new Money(data.amountMinor, data.currencyCode);
  }
}

// Utility functions
export function formatCurrency(
  amountMinor: number,
  currencyCode: string,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    locale?: string;
  }
): string {
  return Money.fromMinor(amountMinor, currencyCode).format(options);
}

export function toMinorUnits(amount: number, currencyCode: string): number {
  return Money.fromMajor(amount, currencyCode).getMinorAmount();
}

export function fromMinorUnits(amountMinor: number, currencyCode: string): number {
  return Money.fromMinor(amountMinor, currencyCode).getMajorAmount();
}

export function getCurrencyDecimals(currencyCode: string): number {
  return CURRENCIES[currencyCode]?.decimals || 2;
}

export function getSupportedCurrencies(): Currency[] {
  return Object.values(CURRENCIES);
}
