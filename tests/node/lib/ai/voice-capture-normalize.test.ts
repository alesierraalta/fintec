import {
  MAX_CAPTURED_TRANSACTIONS,
  normalizeCapturedTransactions,
  type RawCapturedTransaction,
} from '@/lib/ai/voice-capture/normalize';

const ctx = {
  accounts: [
    { id: 'binance', currencyCode: 'USDT' },
    { id: 'bank', currencyCode: 'VES' },
  ],
  categories: [
    { id: 'cine', kind: 'EXPENSE' as const },
    { id: 'sueldo', kind: 'INCOME' as const },
  ],
  today: '2026-10-17',
  imageCount: 2,
};

const raw = (
  overrides: Partial<RawCapturedTransaction> = {}
): RawCapturedTransaction => ({
  date: '2026-10-03',
  amount: 12.5,
  currency: 'usdt',
  type: 'EXPENSE',
  description: '  Cine con amigos ',
  suggestedCategoryId: 'cine',
  suggestedAccountId: 'binance',
  sourceImage: 0,
  confidence: 'HIGH',
  ...overrides,
});

describe('normalizeCapturedTransactions', () => {
  it('keeps a well-formed movement, trimming text and upper-casing currency', () => {
    expect(normalizeCapturedTransactions([raw()], ctx)).toEqual([
      {
        date: '2026-10-03',
        dateInferred: false,
        amount: 12.5,
        currency: 'USDT',
        type: 'EXPENSE',
        description: 'Cine con amigos',
        categoryId: 'cine',
        accountId: 'binance',
        sourceImage: 0,
        confidence: 'HIGH',
        merchant: null,
      },
    ]);
  });

  it('keeps the merchant text as shown, trimmed, or null when blank', () => {
    const result = normalizeCapturedTransactions(
      [raw({ merchant: '  CINEX LIDER ' }), raw({ merchant: '  ' })],
      ctx
    );
    expect(result.map((t) => t.merchant)).toEqual(['CINEX LIDER', null]);
  });

  it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])(
    'drops a movement with amount %p',
    (amount) => {
      expect(normalizeCapturedTransactions([raw({ amount })], ctx)).toEqual([]);
    }
  );

  it('discards ids that do not belong to the user', () => {
    const [tx] = normalizeCapturedTransactions(
      [
        raw({
          suggestedCategoryId: 'someone-else',
          suggestedAccountId: 'stolen',
        }),
      ],
      ctx
    );
    expect(tx.categoryId).toBeNull();
    // Falls back to the only account in the movement's currency.
    expect(tx.accountId).toBe('binance');
  });

  it('discards a category whose kind does not match the movement type', () => {
    const [tx] = normalizeCapturedTransactions(
      [raw({ type: 'INCOME', suggestedCategoryId: 'cine' })],
      ctx
    );
    expect(tx.categoryId).toBeNull();
  });

  it('leaves the account empty when no single account matches the currency', () => {
    const [tx] = normalizeCapturedTransactions(
      [raw({ currency: 'EUR', suggestedAccountId: null })],
      ctx
    );
    expect(tx.accountId).toBeNull();
  });

  it('uses today and flags it when the date is missing or invalid', () => {
    const result = normalizeCapturedTransactions(
      [raw({ date: null }), raw({ date: '2026-02-30' }), raw({ date: 'ayer' })],
      ctx
    );
    expect(result.map((t) => [t.date, t.dateInferred])).toEqual([
      ['2026-10-17', true],
      ['2026-10-17', true],
      ['2026-10-17', true],
    ]);
  });

  it('drops an out-of-range source image index and defaults blank text', () => {
    const [tx] = normalizeCapturedTransactions(
      [raw({ sourceImage: 5, description: '   ', currency: '' })],
      ctx
    );
    expect(tx.sourceImage).toBeNull();
    expect(tx.description).toBe('Movimiento');
    expect(tx.currency).toBe('USDT');
  });

  it('reads bolívar symbols as VES instead of assuming USD', () => {
    const vesCtx = {
      ...ctx,
      accounts: [
        { id: 'usd', currencyCode: 'USD' },
        { id: 'ves', currencyCode: 'VES' },
      ],
    };
    const result = normalizeCapturedTransactions(
      [
        raw({ currency: 'Bs', suggestedAccountId: null }),
        raw({ currency: 'Bs.', suggestedAccountId: null }),
      ],
      vesCtx
    );
    expect(result.map((t) => [t.currency, t.accountId])).toEqual([
      ['VES', 'ves'],
      ['VES', 'ves'],
    ]);
  });

  it('does not assign an account when the currency is unreadable', () => {
    const usdCtx = { ...ctx, accounts: [{ id: 'usd', currencyCode: 'USD' }] };
    const [tx] = normalizeCapturedTransactions(
      [raw({ currency: '', suggestedAccountId: null })],
      usdCtx
    );
    expect(tx.accountId).toBeNull();
  });

  it(`keeps at most ${MAX_CAPTURED_TRANSACTIONS} movements`, () => {
    const many = Array.from({ length: MAX_CAPTURED_TRANSACTIONS + 25 }, () =>
      raw()
    );
    expect(normalizeCapturedTransactions(many, ctx)).toHaveLength(
      MAX_CAPTURED_TRANSACTIONS
    );
  });
});
