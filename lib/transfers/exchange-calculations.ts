import { fromMinorUnits, toMinorUnits } from '@/lib/money';

const RATE_SCALE = 1_000_000;

export type LastEditedTransferField = 'source' | 'target' | 'rate';

interface RecalculateTransferAmountsInput {
  fromCurrency?: string;
  toCurrency?: string;
  exchangeRate?: number;
  sourceAmountMajor: number;
  targetAmountMajor: number;
  lastEdited: LastEditedTransferField;
}

interface RecalculateTransferAmountsResult {
  sourceAmountMajor: number;
  targetAmountMajor: number;
}

function isPositiveFinite(value?: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function getScaledRate(exchangeRate: number): number {
  return Math.max(1, Math.round(exchangeRate * RATE_SCALE));
}

function multiplyByRate(minorAmount: number, exchangeRate: number): number {
  const scaledRate = getScaledRate(exchangeRate);
  return Math.round((minorAmount * scaledRate) / RATE_SCALE);
}

function divideByRate(minorAmount: number, exchangeRate: number): number {
  const scaledRate = getScaledRate(exchangeRate);
  return Math.round((minorAmount * RATE_SCALE) / scaledRate);
}

export function isUsdVesTransferPair(
  fromCurrency?: string,
  toCurrency?: string
): boolean {
  return (
    (fromCurrency === 'USD' && toCurrency === 'VES') ||
    (fromCurrency === 'VES' && toCurrency === 'USD')
  );
}

export function calculateExchangeRateFromAmounts(
  sourceAmountMajor: number,
  targetAmountMajor: number,
  fromCurrency: string,
  toCurrency: string
): number | undefined {
  if (
    !isPositiveFinite(sourceAmountMajor) ||
    !isPositiveFinite(targetAmountMajor)
  ) {
    return undefined;
  }

  const sourceMinor = toMinorUnits(sourceAmountMajor, fromCurrency);
  const targetMinor = toMinorUnits(targetAmountMajor, toCurrency);

  if (sourceMinor <= 0 || targetMinor <= 0) {
    return undefined;
  }

  const rawRate = targetMinor / sourceMinor;
  return getScaledRate(rawRate) / RATE_SCALE;
}

export function calculateTargetAmountFromSource(
  sourceAmountMajor: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate?: number
): number {
  if (!isPositiveFinite(exchangeRate)) {
    return 0;
  }

  const sourceMinor = toMinorUnits(sourceAmountMajor, fromCurrency);
  const targetMinor = multiplyByRate(sourceMinor, exchangeRate);
  return fromMinorUnits(targetMinor, toCurrency);
}

export function calculateSourceAmountFromTarget(
  targetAmountMajor: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate?: number
): number {
  if (!isPositiveFinite(exchangeRate)) {
    return 0;
  }

  const targetMinor = toMinorUnits(targetAmountMajor, toCurrency);
  const sourceMinor = divideByRate(targetMinor, exchangeRate);
  return fromMinorUnits(sourceMinor, fromCurrency);
}

export function recalculateTransferAmounts(
  input: RecalculateTransferAmountsInput
): RecalculateTransferAmountsResult {
  const {
    fromCurrency,
    toCurrency,
    exchangeRate,
    sourceAmountMajor,
    targetAmountMajor,
    lastEdited,
  } = input;

  if (!isUsdVesTransferPair(fromCurrency, toCurrency)) {
    return {
      sourceAmountMajor,
      targetAmountMajor,
    };
  }

  if (!fromCurrency || !toCurrency || !isPositiveFinite(exchangeRate)) {
    return {
      sourceAmountMajor,
      targetAmountMajor: 0,
    };
  }

  if (lastEdited === 'target') {
    return {
      sourceAmountMajor: calculateSourceAmountFromTarget(
        targetAmountMajor,
        fromCurrency,
        toCurrency,
        exchangeRate
      ),
      targetAmountMajor,
    };
  }

  return {
    sourceAmountMajor,
    targetAmountMajor: calculateTargetAmountFromSource(
      sourceAmountMajor,
      fromCurrency,
      toCurrency,
      exchangeRate
    ),
  };
}
