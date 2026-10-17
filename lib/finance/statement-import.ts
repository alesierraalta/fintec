import { TransactionType } from '@/types/domain';
import { parseAmountInput } from './quick-entry';

export interface StatementColumnMapping {
  date: number | null;
  description: number | null;
  reference: number | null;
  amount: number | null;
  debit: number | null;
  credit: number | null;
}

export interface StatementRow {
  /** 1-based line number in the original file. */
  rowNumber: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  reference?: string;
}

export interface StatementMapOptions {
  hasHeader: boolean;
  /** Bank exports expenses as positive amounts in a single column. */
  invertSign?: boolean;
}

function detectDelimiter(firstLine: string): string {
  const candidates = [';', ',', '\t'];
  let best = ',';
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/**
 * RFC 4180-style CSV parser with delimiter detection and BOM stripping.
 * Blank lines are kept as empty rows so row indexes stay aligned with file
 * lines; a quote that does not open a field is kept as a literal character.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(source.split(/\r?\n/, 1)[0] ?? '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushRow = () => {
    row.push(field);
    rows.push(
      row.some((cell) => cell.trim() !== '')
        ? row.map((cell) => cell.trim())
        : []
    );
    row = [];
    field = '';
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      pushRow();
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) pushRow();
  return rows;
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Accepts dd/mm/yyyy, dd-mm-yy and ISO dates, optionally followed by a time;
 * returns yyyy-mm-dd or null.
 */
export function parseStatementDate(raw: string): string | null {
  const value = raw.trim();
  let year: number;
  let month: number;
  let day: number;

  const iso = value.match(
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[\sT]+\d{1,2}:\d{2}.*)?$/
  );
  const local = value.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:[\sT]+\d{1,2}:\d{2}.*)?$/
  );
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (local) {
    day = Number(local[1]);
    month = Number(local[2]);
    year = Number(local[3]);
    if (local[3].length === 2) year += 2000;
  } else {
    return null;
  }

  if (!isValidDate(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const HEADER_PATTERNS: Record<keyof StatementColumnMapping, RegExp> = {
  date: /fecha|date/,
  reference:
    /referencia|ref\b|ref\.|nro|n[uú]mero|reference|comprobante|secuencia|control/,
  description: /descrip|concepto|detalle|memo|description|payee|motivo/,
  debit: /d[eé]bito|cargo|retiro|egreso|debit|withdraw/,
  credit: /cr[eé]dito|abono|dep[oó]sito|ingreso|credit|deposit/,
  amount: /monto|importe|amount|valor|total\b/,
};

export function guessColumnMapping(headers: string[]): StatementColumnMapping {
  const normalized = headers.map((header) => header.toLowerCase().trim());
  const taken = new Set<number>();
  // "Fecha valor" is a date column: never let it match amount/other patterns.
  const isDateHeader = normalized.map((header) =>
    HEADER_PATTERNS.date.test(header)
  );
  const find = (pattern: RegExp): number | null => {
    const index = normalized.findIndex(
      (header, i) =>
        !taken.has(i) &&
        (pattern === HEADER_PATTERNS.date || !isDateHeader[i]) &&
        pattern.test(header)
    );
    if (index < 0) return null;
    taken.add(index);
    return index;
  };

  const date = find(HEADER_PATTERNS.date);
  const reference = find(HEADER_PATTERNS.reference);
  const debit = find(HEADER_PATTERNS.debit);
  const credit = find(HEADER_PATTERNS.credit);
  const description = find(HEADER_PATTERNS.description);
  const amount = find(HEADER_PATTERNS.amount);

  return { date, reference, description, amount, debit, credit };
}

/** First non-blank row: the header when the file has one. */
export function firstRecord(rows: string[][]): string[] {
  return rows.find((row) => row.length > 0) ?? [];
}

function cellAmount(row: string[], index: number | null): number | null {
  if (index === null) return null;
  const raw = row[index]?.trim() ?? '';
  return raw === '' ? null : parseAmountInput(raw);
}

/**
 * Maps raw CSV rows to typed statement rows. Rows whose date or amount cannot
 * be read, or whose amount is zero, are reported by line number instead.
 */
export function mapStatementRows(
  rows: string[][],
  mapping: StatementColumnMapping,
  options: StatementMapOptions
): { rows: StatementRow[]; invalidRows: number[] } {
  const result: StatementRow[] = [];
  const invalidRows: number[] = [];
  const offset = options.hasHeader
    ? rows.findIndex((row) => row.length > 0) + 1
    : 0;

  rows.slice(offset).forEach((row, i) => {
    const rowNumber = i + offset + 1;
    if (row.length === 0) return;
    const date =
      mapping.date === null
        ? null
        : parseStatementDate(row[mapping.date] ?? '');

    let signed: number | null = null;
    if (mapping.amount !== null) {
      const value = cellAmount(row, mapping.amount);
      signed = value === null ? null : options.invertSign ? -value : value;
    } else {
      const debit = cellAmount(row, mapping.debit);
      const credit = cellAmount(row, mapping.credit);
      if (debit !== null || credit !== null) {
        signed = (credit ?? 0) - Math.abs(debit ?? 0);
      }
    }

    if (!date || signed === null || signed === 0) {
      invalidRows.push(rowNumber);
      return;
    }

    const reference =
      mapping.reference === null ? '' : (row[mapping.reference] ?? '').trim();
    const description =
      mapping.description === null
        ? ''
        : (row[mapping.description] ?? '').trim();

    result.push({
      rowNumber,
      date,
      description: description || reference || 'Movimiento importado',
      amount: Math.abs(signed),
      type: signed < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
      reference: reference || undefined,
    });
  });

  return { rows: result, invalidRows };
}
