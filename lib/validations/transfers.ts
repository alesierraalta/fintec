import { getCurrencyDecimals } from '@/lib/money';

export class TransferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferValidationError';
  }
}

function countDecimals(value: number): number {
  const str = value.toString();
  if (str.includes('e') || str.includes('E')) {
    const [base, expStr] = str.split(/[eE]/);
    const exp = Number(expStr);
    const baseDecimals = base.includes('.') ? base.split('.')[1].length : 0;
    return Math.max(0, baseDecimals - exp);
  }
  if (!str.includes('.')) return 0;
  return str.split('.')[1].length;
}

export function parseMajorToMinorStrict(
  raw: unknown,
  currencyCode: string,
  fieldName = 'amount'
): number {
  if (raw === undefined || raw === null || raw === '') {
    throw new TransferValidationError(`${fieldName} is required`);
  }
  let major: number;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') throw new TransferValidationError(`${fieldName} is required`);
    major = Number(trimmed);
  } else if (typeof raw === 'number') {
    major = raw;
  } else {
    throw new TransferValidationError(`${fieldName} must be a number`);
  }
  if (!Number.isFinite(major)) throw new TransferValidationError(`${fieldName} must be finite`);
  if (major <= 0) throw new TransferValidationError(`${fieldName} must be positive`);
  const decimals = getCurrencyDecimals(currencyCode);
  const decCount = countDecimals(major);
  if (decCount > decimals) {
    throw new TransferValidationError(`${fieldName} exceeds ${decimals} decimal places for ${currencyCode}`);
  }
  const factor = Math.pow(10, decimals);
  const minor = Math.round(major * factor);
  if (!Number.isSafeInteger(minor) || !Number.isFinite(minor)) {
    throw new TransferValidationError(`${fieldName} overflows safe integer`);
  }
  // verify no hidden precision loss
  const reconstructed = minor / factor;
  if (Math.abs(reconstructed - major) > 1e-9) {
    throw new TransferValidationError(`${fieldName} has invalid precision`);
  }
  return minor;
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
    throw new TransferValidationError('commission must be a number');
  }
  if (!Number.isFinite(major)) throw new TransferValidationError('commission must be finite');
  if (major < 0) throw new TransferValidationError('commission must be non-negative');
  // zero is allowed
  if (major === 0) return 0;
  const decimals = getCurrencyDecimals(currencyCode);
  const decCount = countDecimals(major);
  if (decCount > decimals) {
    throw new TransferValidationError(`commission exceeds ${decimals} decimal places for ${currencyCode}`);
  }
  const factor = Math.pow(10, decimals);
  const minor = Math.round(major * factor);
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new TransferValidationError('commission overflows safe integer');
  }
  if (!Number.isSafeInteger(minor)) throw new TransferValidationError('commission overflows');
  return minor;
}

export function getTotalDebitMinor(
  amountMinor: number,
  commissionMinor?: number
): number {
  const c = commissionMinor ?? 0;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new TransferValidationError('amountMinor must be positive safe integer');
  }
  if (c !== 0 && (!Number.isSafeInteger(c) || c < 0)) {
    throw new TransferValidationError('commissionMinor must be non-negative safe integer');
  }
  const total = amountMinor + c;
  if (!Number.isSafeInteger(total) || total > Number.MAX_SAFE_INTEGER) {
    throw new TransferValidationError('total debit overflows');
  }
  return total;
}
