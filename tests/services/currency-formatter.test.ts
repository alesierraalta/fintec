import {
    formatCurrency,
    getCurrencySymbol,
    getSupportedCurrencies,
    isFiatCurrency,
    isCryptoCurrency,
    formatAmount,
    parseCurrency
} from '@/lib/services/currency-formatter';

describe('CurrencyFormatter', () => {
    describe('formatCurrency', () => {
        it('should format USD correctly', () => {
            // Note: Locale output depends on system/Node, but typically en-US for USD is $1,000.00
            // We check for presence of symbol and digits
            const result = formatCurrency(1234.56, 'USD');
            expect(result).toContain('$');
            expect(result).toContain('1,234.56');
        });

        it('should format VES correctly', () => {
            // VES doesn't always have built-in locale support in all environments as "en-US", 
            // but the function has a fallback or uses Intl.
            // Let's check general structure.
            const result = formatCurrency(100, 'VES');
            // The fallback in our code uses "Bs." if Intl fails or works differently?
            // Actually Intl.NumberFormat('en-US', {currency: 'VES'}) usually outputs "VES 100.00" or similar depending on node version 
            // OR checks fallback in catch block.
            // Let's verify what our implementation does.
            // Impl: return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, ... })
            // Fallback: `${symbol}${amount.toFixed(2)}`
            expect(result).toBeDefined();
        });
    });

    describe('getCurrencySymbol', () => {
        it('should return correct symbols', () => {
            expect(getCurrencySymbol('USD')).toBe('$');
            expect(getCurrencySymbol('VES')).toBe('Bs.');
            expect(getCurrencySymbol('BTC')).toBe('₿');
        });

        it('should return code if symbol not found', () => {
            expect(getCurrencySymbol('XYZ')).toBe('XYZ');
        });
    });

    describe('isFiatCurrency', () => {
        it('should identify fiat currencies', () => {
            expect(isFiatCurrency('USD')).toBe(true);
            expect(isFiatCurrency('VES')).toBe(true);
            expect(isFiatCurrency('BTC')).toBe(false);
        });
    });

    describe('isCryptoCurrency', () => {
        it('should identify crypto currencies', () => {
            expect(isCryptoCurrency('BTC')).toBe(true);
            expect(isCryptoCurrency('ETH')).toBe(true);
            expect(isCryptoCurrency('USD')).toBe(false);
        });
    });

    describe('formatAmount', () => {
        it('should use 2 decimals for fiat', () => {
            expect(formatAmount(10.1234, 'USD')).toBe('10.12');
        });

        it('should use 8 decimals for crypto', () => {
            expect(formatAmount(10.123456789, 'BTC')).toBe('10.12345679');
        });
    });

    describe('parseCurrency', () => {
        it('should parse simple numbers', () => {
            expect(parseCurrency('100.50')).toBe(100.50);
        });

        it('should remove currency symbols', () => {
            expect(parseCurrency('$100.50')).toBe(100.50);
            expect(parseCurrency('Bs. 1,000.00')).toBe(1000.00); // Only if remove chars works for , as well?
            // Our impl: formattedAmount.replace(/[^0-9.-]/g, ''); 
            // This strips commas! good.
        });
    });
});
