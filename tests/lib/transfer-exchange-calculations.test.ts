import {
  calculateExchangeRateFromAmounts,
  calculateSourceAmountFromTarget,
  calculateTargetAmountFromSource,
  isExchangeableTransferPair,
  recalculateTransferAmounts,
} from '@/lib/transfers/exchange-calculations';

describe('transfer exchange calculations', () => {
  it('detects exchangeable pairs in both directions', () => {
    expect(isExchangeableTransferPair('USD', 'VES')).toBe(true);
    expect(isExchangeableTransferPair('VES', 'USD')).toBe(true);
    expect(isExchangeableTransferPair('USD', 'USD')).toBe(true);
    expect(isExchangeableTransferPair('USD', 'EUR')).toBe(false);
  });

  it('converts source to target with deterministic minor-unit rounding', () => {
    const targetAmount = calculateTargetAmountFromSource(
      10.01,
      'USD',
      'VES',
      36.71
    );
    expect(targetAmount).toBe(367.47);
  });

  it('converts target to source with deterministic minor-unit rounding', () => {
    const sourceAmount = calculateSourceAmountFromTarget(
      367.47,
      'USD',
      'VES',
      36.71
    );
    expect(sourceAmount).toBe(10.01);
  });

  it('derives exchange rate from source and target amounts for USD to VES', () => {
    const rate = calculateExchangeRateFromAmounts(10, 365, 'USD', 'VES');
    expect(rate).toBe(36.5);
  });

  it('derives exchange rate from source and target amounts for VES to USD', () => {
    const rate = calculateExchangeRateFromAmounts(365, 10, 'VES', 'USD');
    expect(rate).toBe(0.027397);
  });

  it('applies last-edited-wins preserving target when target was edited last', () => {
    const result = recalculateTransferAmounts({
      fromCurrency: 'VES',
      toCurrency: 'USD',
      exchangeRate: 0.0272,
      sourceAmountMajor: 0,
      targetAmountMajor: 15,
      lastEdited: 'target',
    });

    expect(result.targetAmountMajor).toBe(15);
    expect(result.sourceAmountMajor).toBe(551.47);
  });

  it('keeps non USD/VES flows unchanged', () => {
    const result = recalculateTransferAmounts({
      fromCurrency: 'EUR',
      toCurrency: 'USD',
      exchangeRate: 1.12,
      sourceAmountMajor: 20,
      targetAmountMajor: 22.4,
      lastEdited: 'source',
    });

    expect(result).toEqual({
      sourceAmountMajor: 20,
      targetAmountMajor: 22.4,
    });
  });
});
