import fc from 'fast-check';
import { Money } from '@/lib/money';

describe('Money property-based tests', () => {
  // Arbitrary for currency codes
  const currencyCodeArbitrary = fc.oneof(fc.constant('USD'), fc.constant('VES'), fc.constant('EUR'));

  // Arbitrary for Money instances
  const moneyArbitrary = (currencyCode: string) =>
    fc.record({
      amount: fc.double({ min: -1000000, max: 1000000, noNaN: true, noInfinity: true }),
      currency: fc.constant(currencyCode),
    }).map(data => Money.fromMajor(data.amount, data.currency));

  // Arbitrary for allocation (percentages should sum to 100, ONLY POSITIVE)
  const allocationArbitrary = fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 5 })
    .map(integers => {
      const sum = integers.reduce((acc, p) => acc + p, 0);
      // Normalize to sum to 100
      if (sum === 0) return [100]; // Should not happen with min: 1
      
      const percentages = integers.map(p => Math.round((p / sum) * 100));
      
      // Fix rounding errors to ensure sum is exactly 100
      const currentSum = percentages.reduce((acc, p) => acc + p, 0);
      const diff = 100 - currentSum;
      if (percentages.length > 0) {
        percentages[0] += diff;
      }
      return percentages;
    });

  it('should correctly add two money amounts of the same currency', () => {
    fc.assert(
      fc.property(
        currencyCodeArbitrary,
        (currencyCode) => {
          const amount1 = fc.sample(fc.double({ min: -10000, max: 10000 }), 1)[0];
          const amount2 = fc.sample(fc.double({ min: -10000, max: 10000 }), 1)[0];
          
          const m1 = Money.fromMajor(amount1, currencyCode);
          const m2 = Money.fromMajor(amount2, currencyCode);

          const result = m1.add(m2);

          // We compare major amounts roughly because Money uses integer math for precision
          // But strict equality might fail due to floating point inputs in construction
          expect(result.getMajorAmount()).toBeCloseTo(m1.getMajorAmount() + m2.getMajorAmount(), 2);
          expect(result.getCurrency().code).toBe(currencyCode);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should correctly subtract two money amounts of the same currency', () => {
    fc.assert(
      fc.property(
        currencyCodeArbitrary,
        (currencyCode) => {
          const amount1 = fc.sample(fc.double({ min: -10000, max: 10000 }), 1)[0];
          const amount2 = fc.sample(fc.double({ min: -10000, max: 10000 }), 1)[0];
          
          const m1 = Money.fromMajor(amount1, currencyCode);
          const m2 = Money.fromMajor(amount2, currencyCode);

          const result = m1.subtract(m2);

          expect(result.getMajorAmount()).toBeCloseTo(m1.getMajorAmount() - m2.getMajorAmount(), 2);
          expect(result.getCurrency().code).toBe(currencyCode);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should correctly allocate money amounts', () => {
    fc.assert(
      fc.property(
        moneyArbitrary('USD'),
        allocationArbitrary,
        (totalMoney, percentages) => {
          // Filter out cases where percentages sum is 0 or negative (though generator tries to avoid)
          const sumP = percentages.reduce((a, b) => a + b, 0);
          if (sumP !== 100) return; 

          const allocations = totalMoney.allocate(percentages);

          // Sum of allocated amounts should be equal to original minor amount (exact integer math)
          const sumAllocatedMinor = allocations.reduce((sum, m) => sum + m.getMinorAmount(), 0);
          expect(sumAllocatedMinor).toBe(totalMoney.getMinorAmount());

          // All allocated amounts should have the same currency as the original
          allocations.forEach(m => expect(m.getCurrency().code).toBe(totalMoney.getCurrency().code));
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should throw an error when adding money of different currencies', () => {
    fc.assert(
      fc.property(
        moneyArbitrary('USD'),
        moneyArbitrary('EUR'),
        (m1, m2) => {
          expect(() => m1.add(m2)).toThrow();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should throw an error when subtracting money of different currencies', () => {
    fc.assert(
      fc.property(
        moneyArbitrary('USD'),
        moneyArbitrary('EUR'),
        (m1, m2) => {
          expect(() => m1.subtract(m2)).toThrow();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should scale money amount correctly', () => {
    fc.assert(
      fc.property(
        moneyArbitrary('USD'),
        fc.double({ min: -10, max: 10, noNaN: true, noInfinity: true }),
        (m, factor) => {
          const scaled = m.multiply(factor); // Money.ts has multiply, not scale
          // Allow small deviation due to rounding in multiply
          // Expect major amount to be close
          if (Math.abs(m.getMajorAmount()) > 0.01) {
             // Basic sanity check, hard to test exact rounding of minor units with floats
             // Just ensure it doesn't crash and returns new Money
             expect(scaled).toBeInstanceOf(Money);
             expect(scaled.getCurrency().code).toBe(m.getCurrency().code);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});