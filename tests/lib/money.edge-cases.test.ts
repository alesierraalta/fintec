import { Money } from '@/lib/money';
import { Currency } from '@/types';

describe('Money edge cases and error handling', () => {
  it('should reject NaN amounts on construction', () => {
    expect(() => new Money(NaN, 'USD')).toThrow(
      'amountMinor must be an integer'
    );
  });

  it('should reject Infinity amounts on construction', () => {
    expect(() => new Money(Infinity, 'USD')).toThrow(
      'amountMinor must be an integer'
    );
    expect(() => new Money(-Infinity, 'USD')).toThrow(
      'amountMinor must be an integer'
    );
  });

  it('should throw an error if multiplied by NaN', () => {
    const m1 = new Money(100, 'USD');
    expect(() => m1.multiply(NaN)).toThrow();
  });

  it('should throw an error if multiplied by Infinity', () => {
    const m1 = new Money(100, 'USD');
    expect(() => m1.multiply(Infinity)).toThrow();
  });

  // Test for null/undefined - these should ideally be caught by TypeScript,
  // but if they somehow get through, the class methods should handle them.
  // This usually requires runtime type checks or careful API design.
  // For now, we'll assume valid types due to TypeScript, but consider a helper function if needed.
});
