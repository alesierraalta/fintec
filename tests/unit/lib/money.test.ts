import {
  Money,
  formatCurrency,
  toMinorUnits,
  fromMinorUnits,
  getCurrencyDecimals,
  getSupportedCurrencies,
  CURRENCIES,
} from '../../../lib/money';

describe('money utils', () => {
  describe('Money class', () => {
    it('creates Money from minor units', () => {
      const money = Money.fromMinor(1000, 'USD');
      expect(money.getMinorAmount()).toBe(1000);
      expect(money.getMajorAmount()).toBe(10);
    });

    it('creates Money from major units', () => {
      const money = Money.fromMajor(10.5, 'USD');
      expect(money.getMinorAmount()).toBe(1050);
      expect(money.getMajorAmount()).toBe(10.5);
    });

    it('handles negative-zero rounding', () => {
      const money = Money.fromMinor(-0, 'USD');
      expect(money.getMinorAmount()).toBe(0);
    });

    it('uses fallback decimals for unknown currency', () => {
      const money = Money.fromMajor(10, 'UNKNOWN');
      expect(money.getMinorAmount()).toBe(1000);
      expect(money.getCurrency().decimals).toBe(2);
    });

    describe('add / subtract', () => {
      it('adds two amounts of same currency', () => {
        const m1 = Money.fromMinor(100, 'USD');
        const m2 = Money.fromMinor(200, 'USD');
        expect(m1.add(m2).getMinorAmount()).toBe(300);
      });

      it('subtracts two amounts of same currency', () => {
        const m1 = Money.fromMinor(200, 'USD');
        const m2 = Money.fromMinor(50, 'USD');
        expect(m1.subtract(m2).getMinorAmount()).toBe(150);
      });

      it('throws when adding different currencies', () => {
        const m1 = Money.fromMinor(100, 'USD');
        const m2 = Money.fromMinor(100, 'EUR');
        expect(() => m1.add(m2)).toThrow();
      });

      it('throws when subtracting different currencies', () => {
        const m1 = Money.fromMinor(100, 'USD');
        const m2 = Money.fromMinor(100, 'EUR');
        expect(() => m1.subtract(m2)).toThrow();
      });

      it('throws on non-finite result', () => {
        const m1 = Money.fromMinor(Number.MAX_VALUE, 'USD');
        const m2 = Money.fromMinor(Number.MAX_VALUE, 'USD');
        expect(() => m1.add(m2)).toThrow();
      });

      it('throws on non-finite subtraction', () => {
        const m1 = Money.fromMinor(-Number.MAX_VALUE, 'USD');
        const m2 = Money.fromMinor(Number.MAX_VALUE, 'USD');
        expect(() => m1.subtract(m2)).toThrow();
      });
    });

    describe('multiply / divide', () => {
      it('multiplies by factor', () => {
        const m1 = Money.fromMinor(100, 'USD');
        expect(m1.multiply(2).getMinorAmount()).toBe(200);
      });

      it('throws if multiplying from non-finite', () => {
        const m1 = Money.fromMinor(Infinity as number, 'USD');
        expect(() => m1.multiply(2)).toThrow();
      });

      it('throws if multiplier is non-finite', () => {
        const m1 = Money.fromMinor(100, 'USD');
        expect(() => m1.multiply(Infinity as number)).toThrow();
      });

      it('divides by divisor', () => {
        const m1 = Money.fromMinor(100, 'USD');
        expect(m1.divide(2).getMinorAmount()).toBe(50);
      });

      it('throws on divide by zero', () => {
        const m1 = Money.fromMinor(100, 'USD');
        expect(() => m1.divide(0)).toThrow();
      });

      it('throws if divisor is non-finite', () => {
        const m1 = Money.fromMinor(100, 'USD');
        expect(() => m1.divide(Infinity as number)).toThrow();
      });

      it('throws if dividing from non-finite', () => {
        const m1 = Money.fromMinor(Infinity as number, 'USD');
        expect(() => m1.divide(2)).toThrow();
      });
    });

    describe('boolean checks', () => {
      it('checks isZero', () => {
        expect(Money.fromMinor(0, 'USD').isZero()).toBe(true);
        expect(Money.fromMinor(10, 'USD').isZero()).toBe(false);
      });

      it('checks isPositive', () => {
        expect(Money.fromMinor(10, 'USD').isPositive()).toBe(true);
        expect(Money.fromMinor(-10, 'USD').isPositive()).toBe(false);
      });

      it('checks isNegative', () => {
        expect(Money.fromMinor(-10, 'USD').isNegative()).toBe(true);
        expect(Money.fromMinor(10, 'USD').isNegative()).toBe(false);
      });
    });

    describe('abs / negate', () => {
      it('returns absolute value', () => {
        expect(Money.fromMinor(-100, 'USD').abs().getMinorAmount()).toBe(100);
      });

      it('negates amount', () => {
        expect(Money.fromMinor(100, 'USD').negate().getMinorAmount()).toBe(
          -100
        );
      });
    });

    describe('equals / compare', () => {
      it('checks equality', () => {
        expect(
          Money.fromMinor(100, 'USD').equals(Money.fromMinor(100, 'USD'))
        ).toBe(true);
        expect(
          Money.fromMinor(100, 'USD').equals(Money.fromMinor(200, 'USD'))
        ).toBe(false);
        expect(
          Money.fromMinor(100, 'USD').equals(Money.fromMinor(100, 'EUR'))
        ).toBe(false);
      });

      it('compares amounts', () => {
        expect(
          Money.fromMinor(200, 'USD').compare(Money.fromMinor(100, 'USD'))
        ).toBeGreaterThan(0);
        expect(
          Money.fromMinor(100, 'USD').compare(Money.fromMinor(200, 'USD'))
        ).toBeLessThan(0);
      });

      it('throws when comparing different currencies', () => {
        expect(() =>
          Money.fromMinor(100, 'USD').compare(Money.fromMinor(100, 'EUR'))
        ).toThrow();
      });
    });

    describe('format', () => {
      it('formats currency with default options', () => {
        const formatted = Money.fromMajor(10.5, 'USD').format({
          locale: 'en-US',
        });
        expect(formatted).toBe('$10.50');
      });

      it('formats currency showing code', () => {
        const formatted = Money.fromMajor(10.5, 'USD').format({
          locale: 'en-US',
          showCode: true,
        });
        expect(formatted).toBe('$10.50 USD');
      });

      it('formats currency without symbol', () => {
        const formatted = Money.fromMajor(10.5, 'USD').format({
          locale: 'en-US',
          showSymbol: false,
        });
        expect(formatted).toBe('10.50');
      });
    });

    describe('convertTo', () => {
      it('converts to same currency skips computation', () => {
        const m1 = Money.fromMinor(1000, 'USD');
        expect(m1.convertTo('USD', 2)).toBe(m1);
      });

      it('converts to different currency', () => {
        const m1 = Money.fromMinor(1000, 'USD'); // $10.00
        const m2 = m1.convertTo('EUR', 0.9); // $10 * 0.9 = €9.00 -> 900 minor
        expect(m2.getCurrency().code).toBe('EUR');
        expect(m2.getMinorAmount()).toBe(900);
      });

      it('uses fallback for target currency', () => {
        const m1 = Money.fromMinor(1000, 'USD');
        const m2 = m1.convertTo('UNKNOWN', 2);
        expect(m2.getCurrency().code).toBe('UNKNOWN');
        expect(m2.getMinorAmount()).toBe(2000); // 10 * 2 = 20 -> 2000 minor
      });
    });

    describe('allocate', () => {
      it('allocates evenly based on ratios', () => {
        const m1 = Money.fromMinor(100, 'USD');
        const results = m1.allocate([1, 1]);
        expect(results.length).toBe(2);
        expect(results[0].getMinorAmount()).toBe(50);
        expect(results[1].getMinorAmount()).toBe(50);
      });

      it('distributes remainder properly', () => {
        const m1 = Money.fromMinor(100, 'USD');
        const results = m1.allocate([1, 1, 1]);
        expect(results[0].getMinorAmount()).toBe(34);
        expect(results[1].getMinorAmount()).toBe(33);
        expect(results[2].getMinorAmount()).toBe(33);
      });

      it('throws if ratios empty', () => {
        expect(() => Money.fromMinor(100, 'USD').allocate([])).toThrow();
      });

      it('throws if total ratio is zero', () => {
        expect(() => Money.fromMinor(100, 'USD').allocate([0, 0])).toThrow();
      });
    });

    describe('static factory methods', () => {
      it('creates zero', () => {
        const m = Money.zero('USD');
        expect(m.getMinorAmount()).toBe(0);
      });

      it('creates from string', () => {
        const m = Money.fromString('12.34', 'USD');
        expect(m.getMinorAmount()).toBe(1234);
      });

      it('throws on invalid string', () => {
        expect(() => Money.fromString('invalid', 'USD')).toThrow();
      });
    });

    describe('JSON serialization', () => {
      it('serializes to JSON', () => {
        const json = Money.fromMinor(100, 'USD').toJSON();
        expect(json).toEqual({ amountMinor: 100, currencyCode: 'USD' });
      });

      it('deserializes from JSON', () => {
        const m = Money.fromJSON({ amountMinor: 100, currencyCode: 'USD' });
        expect(m.getMinorAmount()).toBe(100);
      });
    });
  });

  describe('utility functions', () => {
    it('formatCurrency formatting', () => {
      expect(formatCurrency(1050, 'USD', { locale: 'en-US' })).toBe('$10.50');
    });

    it('toMinorUnits converts major to minor', () => {
      expect(toMinorUnits(10.5, 'USD')).toBe(1050);
    });

    it('fromMinorUnits converts minor to major', () => {
      expect(fromMinorUnits(1050, 'USD')).toBe(10.5);
    });

    it('getCurrencyDecimals returns decimals', () => {
      expect(getCurrencyDecimals('USD')).toBe(2);
      expect(getCurrencyDecimals('JPY')).toBe(0);
      expect(getCurrencyDecimals('UNKNOWN')).toBe(2);
    });

    it('getSupportedCurrencies returns array of currencies', () => {
      expect(getSupportedCurrencies().length).toBeGreaterThan(0);
      expect(getSupportedCurrencies()).toContainEqual(CURRENCIES['USD']);
    });
  });
});
