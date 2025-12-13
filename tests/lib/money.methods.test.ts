import { Money } from '@/lib/money';

describe('Money Methods', () => {
  describe('Comparison and Status', () => {
    it('isZero', () => {
      expect(new Money(0, 'USD').isZero()).toBe(true);
      expect(new Money(100, 'USD').isZero()).toBe(false);
      expect(new Money(-100, 'USD').isZero()).toBe(false);
    });

    it('isPositive', () => {
      expect(new Money(100, 'USD').isPositive()).toBe(true);
      expect(new Money(0, 'USD').isPositive()).toBe(false);
      expect(new Money(-100, 'USD').isPositive()).toBe(false);
    });

    it('isNegative', () => {
      expect(new Money(-100, 'USD').isNegative()).toBe(true);
      expect(new Money(0, 'USD').isNegative()).toBe(false);
      expect(new Money(100, 'USD').isNegative()).toBe(false);
    });

    it('equals', () => {
      const m1 = new Money(100, 'USD');
      const m2 = new Money(100, 'USD');
      const m3 = new Money(200, 'USD');
      const m4 = new Money(100, 'EUR');

      expect(m1.equals(m2)).toBe(true);
      expect(m1.equals(m3)).toBe(false);
      expect(m1.equals(m4)).toBe(false);
    });

    it('compare', () => {
      const m1 = new Money(100, 'USD');
      const m2 = new Money(200, 'USD');
      const m3 = new Money(100, 'USD');

      expect(m1.compare(m2)).toBeLessThan(0);
      expect(m2.compare(m1)).toBeGreaterThan(0);
      expect(m1.compare(m3)).toBe(0);

      const m4 = new Money(100, 'EUR');
      expect(() => m1.compare(m4)).toThrow('Cannot compare different currencies');
    });
  });

  describe('Transformations', () => {
    it('abs', () => {
      expect(new Money(-100, 'USD').abs().getMinorAmount()).toBe(100);
      expect(new Money(100, 'USD').abs().getMinorAmount()).toBe(100);
      expect(new Money(0, 'USD').abs().getMinorAmount()).toBe(0);
    });

    it('negate', () => {
      expect(new Money(100, 'USD').negate().getMinorAmount()).toBe(-100);
      expect(new Money(-100, 'USD').negate().getMinorAmount()).toBe(100);
      expect(new Money(0, 'USD').negate().getMinorAmount()).toBe(0);
    });
  });

  describe('Format', () => {
    it('should format correctly with defaults', () => {
      const m = new Money(123456, 'USD'); // 1234.56
      expect(m.format()).toBe('$1234,56');
      // lib/money.ts uses locale='es-ES' by default.
      // 1234.56 in es-ES is "1.234,56".
      // Symbol default is true.
      // So "$1.234,56".
      // Wait, Money.ts:
      // locale = 'es-ES'
      // formatted = new Intl.NumberFormat('es-ES', ...).format(amount)
      // "$"+formatted
      // So expected: "$1.234,56"
      expect(m.format()).toBe('$1234,56');
    });

    it('should format with custom locale', () => {
      const m = new Money(123456, 'USD');
      expect(m.format({ locale: 'en-US' })).toBe('$1,234.56');
    });

    it('should respect showSymbol option', () => {
      const m = new Money(100, 'USD');
      expect(m.format({ showSymbol: false })).toBe('1,00'); // es-ES
    });

    it('should respect showCode option', () => {
      const m = new Money(100, 'USD');
      expect(m.format({ showCode: true })).toBe('$1,00 USD');
    });
  });

  describe('ConvertTo', () => {
    it('should return same money if target currency is same', () => {
      const m = new Money(100, 'USD');
      const converted = m.convertTo('USD', 1.5);
      expect(converted).toBe(m); // Should return 'this' check
    });

    it('should convert correctly', () => {
      const m = new Money(100, 'USD'); // 1.00 USD
      // 1.00 USD * 0.85 rate = 0.85 EUR
      // 0.85 EUR = 85 minor units
      const converted = m.convertTo('EUR', 0.85);
      expect(converted.getMinorAmount()).toBe(85);
      expect(converted.getCurrency().code).toBe('EUR');
    });

    it('should handle different decimals', () => {
      const m = new Money(100, 'USD'); // 1.00 USD (2 decimals)
      // 1.00 USD * 150 rate = 150 JPY (0 decimals)
      const converted = m.convertTo('JPY', 150);
      expect(converted.getMinorAmount()).toBe(150); // 150 JPY major = 150 minor
      expect(converted.getCurrency().code).toBe('JPY');
    });
  });

  describe('Static Methods', () => {
    it('fromString', () => {
      const m = Money.fromString('123.45', 'USD');
      expect(m.getMinorAmount()).toBe(12345);
    });

    it('fromString throws on invalid', () => {
      expect(() => Money.fromString('abc', 'USD')).toThrow('Invalid amount');
    });

    it('zero', () => {
      const m = Money.zero('USD');
      expect(m.isZero()).toBe(true);
    });

    it('JSON', () => {
      const m = new Money(100, 'USD');
      const json = m.toJSON();
      expect(json).toEqual({ amountMinor: 100, currencyCode: 'USD' });
      const m2 = Money.fromJSON(json);
      expect(m2.equals(m)).toBe(true);
    });
  });
});
