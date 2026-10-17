export const QUICK_ENTRY_DEFAULT_DESCRIPTION = 'Gastos varios';

export interface QuickEntry {
  description: string;
  amount: number;
  source: string;
}

export interface QuickEntryParseResult {
  entries: QuickEntry[];
  invalid: string[];
}

const AMOUNT_TOKEN = /^[-+]?[$€]?\d[\d.,]*$/;

/** True when parts form valid thousands groups: "1" "234" "567". */
function isThousandsGrouping(parts: string[]): boolean {
  return (
    /^\d{1,3}$/.test(parts[0]) &&
    parts.slice(1).every((part) => /^\d{3}$/.test(part))
  );
}

/**
 * Parses a user-typed amount accepting both "1.234,56" and "1,234.56".
 * A lone separator followed by exactly three digits is a thousands separator
 * ("1.500" -> 1500), matching how amounts are written in Venezuela.
 * Malformed grouping ("1.2.3", "1,234,56") is rejected rather than guessed.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$€\s]/g, '');
  if (!/^[-+]?\d[\d.,]*$/.test(cleaned)) return null;

  const sign = cleaned.startsWith('-') ? -1 : 1;
  const body = cleaned.replace(/^[-+]/, '');
  const lastDot = body.lastIndexOf('.');
  const lastComma = body.lastIndexOf(',');

  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    const [integer, ...decimals] = body.split(decimalSep);
    const groups = integer.split(thousandsSep);
    if (decimals.length !== 1 || !isThousandsGrouping(groups)) return null;
    normalized = `${groups.join('')}.${decimals[0]}`;
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = body.split(sep);
    if (parts.length > 2) {
      if (!isThousandsGrouping(parts)) return null;
      normalized = parts.join('');
    } else if (parts[1].length === 3) {
      // "1.500" is 1500; "1234.567" is ambiguous, so it is rejected.
      if (!isThousandsGrouping(parts)) return null;
      normalized = parts.join('');
    } else {
      normalized = parts.join('.');
    }
  } else {
    normalized = body;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? sign * value : null;
}

/**
 * Turns free text like "café 2, taxi 5" into entries. Segments are split by
 * newlines, semicolons, or a comma not followed by a digit (so "2,50" stays a
 * decimal and "café 2,taxi 5" still splits). The amount is the last numeric token, or the first one when the
 * segment starts with it ("12 almuerzo").
 */
export function parseQuickEntries(text: string): QuickEntryParseResult {
  const segments = text
    .split(/\r?\n|;|,(?!\d)/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const entries: QuickEntry[] = [];
  const invalid: string[] = [];

  for (const segment of segments) {
    const tokens = segment.split(/\s+/);
    let amountIndex = -1;
    if (AMOUNT_TOKEN.test(tokens[tokens.length - 1])) {
      amountIndex = tokens.length - 1;
    } else if (AMOUNT_TOKEN.test(tokens[0])) {
      amountIndex = 0;
    }

    const amount =
      amountIndex >= 0 ? parseAmountInput(tokens[amountIndex]) : null;
    if (amount === null || amount <= 0) {
      invalid.push(segment);
      continue;
    }

    const description = tokens
      .filter((_, index) => index !== amountIndex)
      .join(' ')
      .trim();
    entries.push({
      description: description || QUICK_ENTRY_DEFAULT_DESCRIPTION,
      amount,
      source: segment,
    });
  }

  return { entries, invalid };
}
