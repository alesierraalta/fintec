import { Money, Currency } from '@/lib/money';

describe('Money edge cases and error handling', () => {
  it('should handle NaN amounts gracefully on construction', () => {
    const m = new Money(NaN, 'USD');
    expect(m.getMajorAmount()).toBeNaN();
    expect(m.getCurrency().code).toBe('USD');
  });

  it('should handle Infinity amounts gracefully on construction', () => {
    const m = new Money(Infinity, 'USD');
    expect(m.getMajorAmount()).toBe(Infinity);
    expect(m.getCurrency().code).toBe('USD');

    const mNeg = new Money(-Infinity, 'USD');
    expect(mNeg.getMajorAmount()).toBe(-Infinity);
    expect(mNeg.getCurrency().code).toBe('USD');
  });

  it('should throw an error when adding Money with NaN amount if target is not NaN', () => {
    const m1 = new Money(NaN, 'USD');
    const m2 = new Money(100, 'USD');
    expect(() => m1.add(m2)).toThrow();
  });

  it('should throw an error when adding Money with Infinity amount if target is not Infinity', () => {
    const m1 = new Money(Infinity, 'USD');
    const m2 = new Money(100, 'USD');
    expect(() => m1.add(m2)).toThrow();
  });

  it('should throw an error when subtracting Money with NaN amount if target is not NaN', () => {
    const m1 = new Money(NaN, 'USD');
    const m2 = new Money(100, 'USD');
    expect(() => m1.subtract(m2)).toThrow();
  });

  it('should throw an error when subtracting Money with Infinity amount if target is not Infinity', () => {
    const m1 = new Money(Infinity, 'USD');
    const m2 = new Money(100, 'USD');
    expect(() => m1.subtract(m2)).toThrow();
  });

  it('should throw an error when multiplying Money with NaN amount if target is not NaN', () => {
    const m1 = new Money(NaN, 'USD');
    expect(() => m1.multiply(2)).toThrow();
  });

  it('should throw an error when multiplying Money with Infinity amount if target is not Infinity', () => {
    const m1 = new Money(Infinity, 'USD');
    expect(() => m1.multiply(2)).toThrow();
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
