import {
  buildReconciliationTransaction,
  RECONCILIATION_DESCRIPTION,
  RECONCILIATION_TAG,
} from '@/lib/finance/reconciliation';
import { parseAmountInput, parseQuickEntries } from '@/lib/finance/quick-entry';
import {
  firstRecord,
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

describe('TSP pinned defects', () => {
  it('splits on a comma followed by a non-digit even without a space', () => {
    expect(
      parseQuickEntries('café 2,taxi 5').entries.map((e) => [
        e.description,
        e.amount,
      ])
    ).toEqual([
      ['café', 2],
      ['taxi', 5],
    ]);
    expect(
      parseQuickEntries('café 2,50,taxi 5').entries.map((e) => [
        e.description,
        e.amount,
      ])
    ).toEqual([
      ['café', 2.5],
      ['taxi', 5],
    ]);
  });

  it.each(['1..2', '1.2.3', '1,234,56', '1.23.456', '1234.567'])(
    'rejects malformed digit grouping %p instead of reading another amount',
    (input) => {
      expect(parseAmountInput(input)).toBeNull();
    }
  );

  it('does not take a "Fecha valor" column as the amount column', () => {
    expect(
      guessColumnMapping([
        'Fecha operación',
        'Fecha valor',
        'Concepto',
        'Importe',
        'Saldo',
      ]).amount
    ).toBe(3);
  });

  it('reports row numbers as lines of the original file when it has blank lines', () => {
    const result = mapStatementRows(
      parseCsv('Fecha,Concepto,Monto\n\n01/09/2026,Bodega,-5\nxx,Roto,5'),
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
    expect(result.rows.map((r) => r.rowNumber)).toEqual([3]);
    expect(result.invalidRows).toEqual([4]);
  });

  it('still finds the header when the file starts with blank lines', () => {
    const rows = parseCsv('\n\nFecha,Concepto,Monto\n01/09/2026,Bodega,-5');
    const mapping = guessColumnMapping(firstRecord(rows));
    expect(mapping.date).toBe(0);
    const result = mapStatementRows(rows, mapping, { hasHeader: true });
    expect(result.rows.map((r) => [r.rowNumber, r.description])).toEqual([
      [4, 'Bodega'],
    ]);
    expect(result.invalidRows).toEqual([]);
  });

  it('keeps a quote inside an unquoted field literal instead of swallowing later rows', () => {
    expect(parseCsv('a,b,c\nx,Tubo 2" pulg,3\ny,z,4')).toEqual([
      ['a', 'b', 'c'],
      ['x', 'Tubo 2" pulg', '3'],
      ['y', 'z', '4'],
    ]);
  });

  it('reads a dd/mm/yyyy date that carries a time, like ISO datetimes', () => {
    expect(parseStatementDate('01/09/2026 10:30')).toBe('2026-09-01');
  });

  it('parses negative amounts formatted with accounting parentheses', () => {
    expect(parseAmountInput('(12.50)')).toBe(-12.5);
    expect(parseAmountInput('(1.234,56)')).toBe(-1234.56);
    expect(parseAmountInput('($50.00)')).toBe(-50);
    expect(parseAmountInput('(Bs. 1.250,00)')).toBe(-1250);
    expect(parseAmountInput('( 12.50 )')).toBe(-12.5);
    expect(parseAmountInput('(12.50')).toBeNull();
    expect(parseAmountInput('12.50)')).toBeNull();
  });

  it('parses amounts with multi-currency prefixes and suffixes (Bs., VES, USD, EUR, Ref, £)', () => {
    expect(parseAmountInput('Bs. 1.250,00')).toBe(1250);
    expect(parseAmountInput('1.250,00 Bs.')).toBe(1250);
    expect(parseAmountInput('150,00 VES')).toBe(150);
    expect(parseAmountInput('USD 45.00')).toBe(45);
    expect(parseAmountInput('45.00 USD')).toBe(45);
    expect(parseAmountInput('EUR 100')).toBe(100);
    expect(parseAmountInput('REF 25.5')).toBe(25.5);
    expect(parseAmountInput('£ 99.99')).toBe(99.99);
  });

  it('parses ISO dates formatted with slashes or dots and optional timestamps', () => {
    expect(parseStatementDate('2026/09/01')).toBe('2026-09-01');
    expect(parseStatementDate('2026.09.01')).toBe('2026-09-01');
    expect(parseStatementDate('2026/09/01 15:30:00')).toBe('2026-09-01');
  });

  it('recognizes bank statement headers with Comprobante, Secuencia, Motivo, and Total', () => {
    const mapping1 = guessColumnMapping([
      'Fecha',
      'Secuencia',
      'Motivo',
      'Total',
    ]);
    expect(mapping1.date).toBe(0);
    expect(mapping1.reference).toBe(1);
    expect(mapping1.description).toBe(2);
    expect(mapping1.amount).toBe(3);

    const mapping2 = guessColumnMapping([
      'Fecha Operación',
      'Comprobante',
      'Concepto',
      'Total Operación',
    ]);
    expect(mapping2.date).toBe(0);
    expect(mapping2.reference).toBe(1);
    expect(mapping2.description).toBe(2);
    expect(mapping2.amount).toBe(3);
  });
});
