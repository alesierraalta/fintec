/**
 * #117/#118: turning matched receipts into the expenses the user announced.
 */
import { planReceiptTransactions } from '@/lib/ai/receipts/plan-receipt-transactions';

const accounts = [
  { id: 'acc-zelle', name: 'Zelle', currencyCode: 'USD' },
  { id: 'acc-banesco', name: 'Banesco', currencyCode: 'VES' },
];

function scan(over: Record<string, unknown>) {
  return {
    type: 'EXPENSE',
    amount: 18.4,
    currency: 'USD',
    date: '2026-11-07',
    suggestedDescription: 'Farmatodo',
    formattedNotes: 'Ticket Farmatodo',
    suggestedAccountId: 'acc-zelle',
    suggestedCategoryId: 'def-salud',
    ...over,
  } as any;
}

describe('planReceiptTransactions', () => {
  it('builds one expense per matched receipt with the receipt amount in the account currency', () => {
    const plan = planReceiptTransactions({
      pending: [
        { id: 'p-farm', name: 'Farmacia' },
        { id: 'p-1', name: 'Gasto 1' },
      ],
      scans: [
        { index: 0, result: scan({}) },
        {
          index: 1,
          result: scan({
            amount: 1250.5,
            currency: 'VES',
            suggestedAccountId: 'acc-banesco',
            suggestedDescription: 'Panadería',
            suggestedCategoryId: undefined,
          }),
        },
      ],
      assignments: [
        { scanIndex: 0, pendingId: 'p-farm', reason: 'description' },
        { scanIndex: 1, pendingId: 'p-1', reason: 'order' },
      ],
      accounts,
      accountOverrides: {},
    });

    expect(plan.ready).toEqual([
      {
        pendingId: 'p-farm',
        transaction: {
          type: 'EXPENSE',
          accountId: 'acc-zelle',
          categoryId: 'def-salud',
          currencyCode: 'USD',
          amountMinor: 1840,
          date: '2026-11-07',
          description: 'Farmacia',
          note: 'Ticket Farmatodo',
        },
      },
      {
        pendingId: 'p-1',
        transaction: {
          type: 'EXPENSE',
          accountId: 'acc-banesco',
          categoryId: undefined,
          currencyCode: 'VES',
          amountMinor: 125050,
          date: '2026-11-07',
          // A generic placeholder takes the receipt's own description.
          description: 'Panadería',
          note: 'Ticket Farmatodo',
        },
      },
    ]);
    expect(plan.needsAccount).toEqual([]);
  });

  it('asks for an account when the receipt has none or its currency differs from the account', () => {
    const plan = planReceiptTransactions({
      pending: [
        { id: 'p-a', name: 'Mercado' },
        { id: 'p-b', name: 'Farmacia' },
      ],
      scans: [
        { index: 0, result: scan({ suggestedAccountId: undefined }) },
        {
          index: 1,
          result: scan({ currency: 'VES', suggestedAccountId: 'acc-zelle' }),
        },
      ],
      assignments: [
        { scanIndex: 0, pendingId: 'p-a', reason: 'description' },
        { scanIndex: 1, pendingId: 'p-b', reason: 'description' },
      ],
      accounts,
      accountOverrides: {},
    });

    expect(plan.ready).toEqual([]);
    expect(plan.needsAccount).toEqual(['p-a', 'p-b']);
  });

  it('uses the account the user picked for a pending expense', () => {
    const plan = planReceiptTransactions({
      pending: [{ id: 'p-a', name: 'Mercado' }],
      scans: [
        {
          index: 0,
          result: scan({
            suggestedAccountId: undefined,
            currency: 'VES',
            amount: 300,
          }),
        },
      ],
      assignments: [{ scanIndex: 0, pendingId: 'p-a', reason: 'description' }],
      accounts,
      accountOverrides: { 'p-a': 'acc-banesco' },
    });

    expect(
      plan.ready.map((r) => [
        r.pendingId,
        r.transaction.accountId,
        r.transaction.amountMinor,
      ])
    ).toEqual([['p-a', 'acc-banesco', 30000]]);
  });
});
