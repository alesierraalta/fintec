import { getCurrencyDecimals } from '@/lib/money';

const SAFE_MAX = Number.MAX_SAFE_INTEGER;

export function isSameCurrencyTransfer(
  fromCurrency?: string,
  toCurrency?: string
): boolean {
  return Boolean(fromCurrency && toCurrency && fromCurrency === toCurrency);
}

export function getEffectiveExchangeRateForTransfer(
  fromCurrency?: string,
  toCurrency?: string,
  exchangeRate?: number
): number {
  if (isSameCurrencyTransfer(fromCurrency, toCurrency)) {
    return 1;
  }
  if (typeof exchangeRate === 'number' && Number.isFinite(exchangeRate) && exchangeRate > 0) {
    return exchangeRate;
  }
  return 1;
}

export function getTargetMinorForTransfer(
  sourceMinor: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate?: number
): number {
  if (!Number.isSafeInteger(sourceMinor) || sourceMinor < 0) return 0;
  if (isSameCurrencyTransfer(fromCurrency, toCurrency)) {
    return sourceMinor;
  }
  if (typeof exchangeRate !== 'number' || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    return 0;
  }
  const RATE_SCALE = 1_000_000;
  const scaled = Math.max(1, Math.round(exchangeRate * RATE_SCALE));
  return Math.round((sourceMinor * scaled) / RATE_SCALE);
}

export function getTotalDebitMinor(
  amountMinor: number,
  commissionMinor?: number
): number {
  const commission = commissionMinor ?? 0;
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error('amountMinor must be a non-negative safe integer');
  }
  if (commission !== 0 && (!Number.isSafeInteger(commission) || commission < 0)) {
    throw new Error('commissionMinor must be a non-negative safe integer');
  }
  const total = amountMinor + commission;
  if (!Number.isSafeInteger(total) || total > SAFE_MAX) {
    throw new Error('total debit overflows safe integer range');
  }
  return total;
}

export function parseCommissionMinor(
  raw: unknown,
  currencyCode: string
): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  let major: number;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    major = Number(trimmed);
  } else if (typeof raw === 'number') {
    major = raw;
  } else {
    throw new Error('commission must be a number or numeric string');
  }
  if (!Number.isFinite(major)) throw new Error('commission must be finite');
  if (major < 0) throw new Error('commission must be non-negative');
  const decimals = getCurrencyDecimals(currencyCode);
  const factor = Math.pow(10, decimals);
  const scaled = major * factor;
  const minor = Math.round(scaled);
  if (!Number.isSafeInteger(minor)) throw new Error('commission overflows safe integer');
  // check over-precision by comparing round-trip
  const reconstructed = minor / factor;
  const diff = Math.abs(reconstructed - major);
  // allow tiny floating error < 0.5 / factor
  const tolerance = 0.5 / factor + 1e-9;
  if (diff > tolerance) {
    // over-precision: check decimal places
    const parts = String(major).split('.');
    if (parts[1] && parts[1].length > decimals) {
      throw new Error(`commission exceeds ${decimals} decimal places for ${currencyCode}`);
    }
  }
  // final strict check: ensure string representation doesn't have excess decimals after rounding
  const str = major.toString();
  if (str.includes('e') || str.includes('E')) {
    // scientific notation, rely on tolerance already
  } else if (str.includes('.')) {
    const decLen = str.split('.')[1]?.length ?? 0;
    if (decLen > decimals) throw new Error(`commission exceeds ${decimals} decimal places`);
  }
  return minor;
}

export function isValidCommissionMinor(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}
