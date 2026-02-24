import {
  calculateSourceAmountFromTarget,
  calculateTargetAmountFromSource,
  isUsdVesTransferPair,
  recalculateTransferAmounts,
} from '@/lib/transfers/exchange-calculations';

describe('transfer exchange calculations', () => {
  it('detects USD/VES pair in both directions', () => {
    expect(isUsdVesTransferPair('USD', 'VES')).toBe(true);
    expect(isUsdVesTransferPair('VES', 'USD')).toBe(true);
    expect(isUsdVesTransferPair('USD', 'EUR')).toBe(false);
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
