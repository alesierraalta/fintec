import { formatCurrencyWithBCV } from '../../../lib/currency-ves';
import { fromMinorUnits } from '../../../lib/money';

describe('currency-ves utilities', () => {
  describe('formatCurrencyWithBCV', () => {
    it('correctly formats USD when minor units are provided', () => {
      // 5000 minor units (cents) should be $50.00
      const amountMinor = 5000;
      const formatted = formatCurrencyWithBCV(amountMinor, 'USD', {
        locale: 'en-US',
      });
      expect(formatted).toBe('$50.00');
    });

    it('displays incorrect value if MAJOR units are passed instead of MINOR units', () => {
      // This replicates the bug: passing 50 (major) instead of 5000 (minor)
      const amountMajor = 50;
      const formatted = formatCurrencyWithBCV(amountMajor, 'USD', {
        locale: 'en-US',
      });

      // It results in $0.50 instead of $50.00
      expect(formatted).toBe('$0.50');
      expect(formatted).not.toBe('$50.00');
    });

    it('correctly formats VES when minor units are provided', () => {
      // 125000 minor units (cents) should be Bs. 1.250,00 (depending on locale)
      const amountMinor = 125000;
      const formatted = formatCurrencyWithBCV(amountMinor, 'VES', {
        locale: 'es-VE',
      });

      // es-VE locale uses . as thousand separator and , as decimal separator
      // Note: formatVES uses vesMoney.format() which uses Intl.NumberFormat
      expect(formatted).toContain('Bs.');
      expect(formatted).toContain('1.250,00');
    });

    it('displays incorrect value if MAJOR units are passed for VES', () => {
      // Replicating bug for VES: passing 1250 (major) instead of 125000 (minor)
      const amountMajor = 1250;
      const formatted = formatCurrencyWithBCV(amountMajor, 'VES', {
        locale: 'es-VE',
      });

      // It results in Bs.12,50 instead of Bs.1.250,00
      // Removing spaces for consistency in comparison
      expect(formatted.replace(/\s/g, '')).toBe('Bs.12,50');
      expect(formatted.replace(/\s/g, '')).not.toBe('Bs.1.250,00');
    });
  });
});
