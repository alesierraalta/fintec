/**
 * Currency Formatter Utilities
 * Handles currency formatting and supported currencies list
 * Extracted from currency-service.ts as part of Phase 3 refactoring
 */

/**
 * Format currency amount for display
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'VES', 'EUR')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
    amount: number,
    currency: string,
    locale: string = 'en-US'
): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (error) {
        // * Fallback for unsupported currencies (e.g., VES, crypto)
        const symbol = getCurrencySymbol(currency);
        return `${symbol}${amount.toFixed(2)}`;
    }
}

/**
 * Get currency symbol for a given currency code
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        VES: 'Bs.',
        BTC: '₿',
        ETH: 'Ξ',
        BNB: 'BNB',
        USDT: '₮',
        BUSD: 'BUSD',
    };

    return symbols[currency.toUpperCase()] || currency;
}

/**
 * Get list of supported currencies
 * @returns Object with fiat and crypto currency arrays
 */
export function getSupportedCurrencies(): { fiat: string[]; crypto: string[] } {
    return {
        fiat: ['USD', 'EUR', 'GBP', 'VES'],
        crypto: ['BTC', 'ETH', 'BNB', 'USDT', 'BUSD', 'ADA', 'SOL'],
    };
}

/**
 * Check if a currency is a fiat currency
 * @param currency - Currency code
 * @returns true if fiat, false otherwise
 */
export function isFiatCurrency(currency: string): boolean {
    const { fiat } = getSupportedCurrencies();
    return fiat.includes(currency.toUpperCase());
}

/**
 * Check if a currency is a cryptocurrency
 * @param currency - Currency code
 * @returns true if crypto, false otherwise
 */
export function isCryptoCurrency(currency: string): boolean {
    const { crypto } = getSupportedCurrencies();
    return crypto.includes(currency.toUpperCase());
}

/**
 * Format amount with appropriate decimal places based on currency type
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted number string
 */
export function formatAmount(amount: number, currency: string): string {
    const isCrypto = isCryptoCurrency(currency);
    const decimals = isCrypto ? 8 : 2;

    return amount.toFixed(decimals);
}

/**
 * Parse formatted currency string to number
 * @param formattedAmount - Formatted currency string
 * @returns Parsed number
 */
export function parseCurrency(formattedAmount: string): number {
    // * Remove currency symbols and separators
    const cleaned = formattedAmount.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? 0 : parsed;
}
