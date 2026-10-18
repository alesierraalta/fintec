import { buildHistoryHints } from '@/lib/ai/voice-capture/history-hints';
import { MAX_HISTORY_HINTS } from '@/lib/ai/voice-capture/capture-service';
import { RECONCILIATION_DESCRIPTION } from '@/lib/finance/reconciliation';
import { TransactionType, type Transaction } from '@/types/domain';

jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const categories = [
  { id: 'salud', name: 'Salud' },
  { id: 'alquiler', name: 'Alquiler' },
];

const tx = (o: Partial<Transaction>): Transaction =>
  ({
    id: Math.random().toString(),
    type: TransactionType.EXPENSE,
    accountId: 'a',
    categoryId: 'salud',
    currencyCode: 'VES',
    amountMinor: 100,
    amountBaseMinor: 1,
    exchangeRate: 1,
    date: '2026-10-01',
    description: 'Farmacia SAAS',
    createdAt: '',
    updatedAt: '',
    ...o,
  }) as Transaction;

describe('buildHistoryHints', () => {
  it('maps described, categorized transactions to description -> category name', () => {
    expect(
      buildHistoryHints(
        [
          tx({ description: '  Farmacia SAAS ' }),
          tx({ description: 'Pago a María Pérez', categoryId: 'alquiler' }),
        ],
        categories
      )
    ).toEqual([
      { description: 'Farmacia SAAS', category: 'Salud' },
      { description: 'Pago a María Pérez', category: 'Alquiler' },
    ]);
  });

  it('skips rows without description, without a known category, transfers and reconciliation adjustments', () => {
    expect(
      buildHistoryHints(
        [
          tx({ description: '  ' }),
          tx({ categoryId: undefined }),
          tx({ categoryId: 'deleted-category' }),
          tx({ transferId: 't1' }),
          tx({ description: RECONCILIATION_DESCRIPTION }),
        ],
        categories
      )
    ).toEqual([]);
  });

  it('keeps one hint per description and category, case- and accent-insensitive, most recent first', () => {
    expect(
      buildHistoryHints(
        [
          tx({ description: 'Farmacia SAAS' }),
          tx({ description: 'FARMACIA saas' }),
          tx({ description: 'Farmacia SAAS', categoryId: 'alquiler' }),
        ],
        categories
      )
    ).toEqual([
      { description: 'Farmacia SAAS', category: 'Salud' },
      { description: 'Farmacia SAAS', category: 'Alquiler' },
    ]);
  });

  it(`keeps at most ${MAX_HISTORY_HINTS} hints`, () => {
    const many = Array.from({ length: MAX_HISTORY_HINTS + 40 }, (_, i) =>
      tx({ description: `Comercio ${i}` })
    );
    expect(buildHistoryHints(many, categories)).toHaveLength(MAX_HISTORY_HINTS);
  });
});
