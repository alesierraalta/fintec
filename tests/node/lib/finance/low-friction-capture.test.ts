import {
  buildReconciliationTransaction,
  RECONCILIATION_DESCRIPTION,
  RECONCILIATION_TAG,
} from '@/lib/finance/reconciliation';
import { parseAmountInput, parseQuickEntries } from '@/lib/finance/quick-entry';
import {
  guessColumnMapping,
  mapStatementRows,
  parseCsv,
  parseStatementDate,
} from '@/lib/finance/statement-import';
import { AccountType, TransactionType, type Account } from '@/types/domain';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Banco',
  type: AccountType.BANK,
  currencyCode: 'USD',
  balance: 50_000,
  active: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

describe('buildReconciliationTransaction (S1, S2)', () => {
  it('creates one EXPENSE for the shortfall when the real balance is lower', () => {
    const tx = buildReconciliationTransaction({
      account: account({ balance: 50_000 }),
      actualBalanceMinor: 34_200,
      date: '2026-10-17',
    });

    expect(tx).toEqual({
      type: TransactionType.EXPENSE,
      accountId: 'acc-1',
      currencyCode: 'USD',
      amountMinor: 15_800,
      exchangeRate: undefined,
      date: '2026-10-17',
      description: RECONCILIATION_DESCRIPTION,
      tags: [RECONCILIATION_TAG],
    });
  });

  it('creates one INCOME for the surplus when the real balance is higher', () => {
    const tx = buildReconciliationTransaction({
      account: account({ balance: 1_000 }),
      actualBalanceMinor: 1_500,
      date: '2026-10-17',
    });

    expect(tx?.type).toBe(TransactionType.INCOME);
    expect(tx?.amountMinor).toBe(500);
  });

  it('creates nothing when balances already match', () => {
    expect(
      buildReconciliationTransaction({
        account: account({ balance: 1_000 }),
        actualBalanceMinor: 1_000,
        date: '2026-10-17',
      })
    ).toBeNull();
  });

  it('handles a negative recorded balance', () => {
    const tx = buildReconciliationTransaction({
      account: account({ balance: -2_000 }),
      actualBalanceMinor: 0,
      date: '2026-10-17',
    });
    expect(tx?.type).toBe(TransactionType.INCOME);
    expect(tx?.amountMinor).toBe(2_000);
  });

  it('carries the exchange rate only for VES accounts', () => {
    const ves = buildReconciliationTransaction({
      account: account({ currencyCode: 'VES', balance: 10_000 }),
      actualBalanceMinor: 4_000,
      date: '2026-10-17',
      exchangeRate: 200,
    });
    const usd = buildReconciliationTransaction({
      account: account(),
      actualBalanceMinor: 0,
      date: '2026-10-17',
      exchangeRate: 200,
    });
    expect(ves?.exchangeRate).toBe(200);
    expect(usd?.exchangeRate).toBeUndefined();
  });

  it('rejects a non-integer real balance', () => {
    expect(() =>
      buildReconciliationTransaction({
        account: account(),
        actualBalanceMinor: 10.5,
        date: '2026-10-17',
      })
    ).toThrow('actualBalanceMinor must be an integer');
  });
});

describe('parseAmountInput', () => {
  it.each([
    ['2', 2],
    ['2,50', 2.5],
    ['2.5', 2.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1.500', 1500],
    ['$12', 12],
    ['-3,5', -3.5],
  ])('parses %s as %s', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3,4x'])('rejects %p', (input) => {
    expect(parseAmountInput(input)).toBeNull();
  });
});

describe('parseQuickEntries (S3)', () => {
  it('splits "café 2, taxi 5" into two entries', () => {
    expect(parseQuickEntries('café 2, taxi 5')).toEqual({
      entries: [
        { description: 'café', amount: 2, source: 'café 2' },
        { description: 'taxi', amount: 5, source: 'taxi 5' },
      ],
      invalid: [],
    });
  });

  it('keeps decimal commas and accepts lines, semicolons and amount-first', () => {
    const { entries, invalid } = parseQuickEntries(
      'café 2,50\n3 empanadas 4;\n12 almuerzo'
    );
    expect(entries.map((e) => [e.description, e.amount])).toEqual([
      ['café', 2.5],
      ['3 empanadas', 4],
      ['almuerzo', 12],
    ]);
    expect(invalid).toEqual([]);
  });

  it('uses a default description for a bare amount', () => {
    expect(parseQuickEntries('40').entries).toEqual([
      { description: 'Gastos varios', amount: 40, source: '40' },
    ]);
  });

  it('reports segments without a positive amount as invalid', () => {
    expect(parseQuickEntries('pan, agua 0, chicle 1')).toEqual({
      entries: [{ description: 'chicle', amount: 1, source: 'chicle 1' }],
      invalid: ['pan', 'agua 0'],
    });
  });
});

describe('statement import (S4)', () => {
  it('parses quoted CSV with semicolons and a BOM', () => {
    expect(
      parseCsv(
        '\uFEFFFecha;Concepto;Monto\r\n01/09/2026;"Pago; bodega";-12,50\n'
      )
    ).toEqual([
      ['Fecha', 'Concepto', 'Monto'],
      ['01/09/2026', 'Pago; bodega', '-12,50'],
    ]);
  });

  it('parses escaped quotes with comma delimiter', () => {
    expect(parseCsv('a,b\n"say ""hi""",2')).toEqual([
      ['a', 'b'],
      ['say "hi"', '2'],
    ]);
  });

  it.each([
    ['01/09/2026', '2026-09-01'],
    ['1-9-26', '2026-09-01'],
    ['2026-09-01', '2026-09-01'],
    ['2026-09-01T10:00:00', '2026-09-01'],
    ['31/02/2026', null],
    ['nope', null],
  ])('parses date %s as %s', (input, expected) => {
    expect(parseStatementDate(input)).toBe(expected);
  });

  it('guesses columns from Spanish headers', () => {
    expect(
      guessColumnMapping([
        'Fecha',
        'Referencia',
        'Descripción',
        'Débito',
        'Crédito',
      ])
    ).toEqual({
      date: 0,
      reference: 1,
      description: 2,
      amount: null,
      debit: 3,
      credit: 4,
    });
    expect(guessColumnMapping(['Date', 'Memo', 'Amount'])).toEqual({
      date: 0,
      reference: null,
      description: 1,
      amount: 2,
      debit: null,
      credit: null,
    });
  });

  it('maps signed amounts and debit/credit columns to typed rows', () => {
    const signed = mapStatementRows(
      [
        ['Fecha', 'Concepto', 'Monto'],
        ['01/09/2026', 'Bodega', '-12,50'],
        ['02/09/2026', 'Sueldo', '300'],
        ['xx', 'Roto', '5'],
        ['03/09/2026', 'Cero', '0'],
      ],
      {
        date: 0,
        description: 1,
        amount: 2,
        reference: null,
        debit: null,
        credit: null,
      },
      { hasHeader: true }
    );
    expect(signed.rows).toEqual([
      {
        rowNumber: 2,
        date: '2026-09-01',
        description: 'Bodega',
        amount: 12.5,
        type: TransactionType.EXPENSE,
        reference: undefined,
      },
      {
        rowNumber: 3,
        date: '2026-09-02',
        description: 'Sueldo',
        amount: 300,
        type: TransactionType.INCOME,
        reference: undefined,
      },
    ]);
    expect(signed.invalidRows).toEqual([4, 5]);

    const inverted = mapStatementRows(
      [['01/09/2026', 'Bodega', '12,50']],
      {
        date: 0,
        description: 1,
        amount: 2,
        reference: null,
        debit: null,
        credit: null,
      },
      { hasHeader: false, invertSign: true }
    );
    expect(inverted.rows[0].type).toBe(TransactionType.EXPENSE);

    const split = mapStatementRows(
      [
        ['01/09/2026', '001', 'Bodega', '12,50', ''],
        ['02/09/2026', '002', 'Pago móvil', '', '40'],
      ],
      {
        date: 0,
        reference: 1,
        description: 2,
        amount: null,
        debit: 3,
        credit: 4,
      },
      { hasHeader: false }
    );
    expect(split.rows.map((r) => [r.type, r.amount, r.reference])).toEqual([
      [TransactionType.EXPENSE, 12.5, '001'],
      [TransactionType.INCOME, 40, '002'],
    ]);
  });
});
