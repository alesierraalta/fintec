import { TransactionType, DebtDirection, DebtStatus } from '@/types';
import {
  getTransactionDisplayName,
  DEFAULT_TRANSACTION_DISPLAY_NAME,
} from '@/lib/transactions/display';

function makeTransaction(
  overrides: Partial<Parameters<typeof getTransactionDisplayName>[0]> = {}
): Parameters<typeof getTransactionDisplayName>[0] {
  return {
    id: 'tx-1',
    type: TransactionType.EXPENSE,
    accountId: 'acc-1',
    currencyCode: 'USD',
    amountMinor: 10000,
    amountBaseMinor: 10000,
    exchangeRate: 1,
    date: '2026-04-30',
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
    ...overrides,
  };
}

describe('getTransactionDisplayName', () => {
  test('returns description when present', () => {
    const tx = makeTransaction({ description: 'Supermercado' });
    expect(getTransactionDisplayName(tx)).toBe('Supermercado');
  });

  test('trims description whitespace', () => {
    const tx = makeTransaction({ description: '  Supermercado  ' });
    expect(getTransactionDisplayName(tx)).toBe('Supermercado');
  });

  test('falls back to categoryName when description is missing', () => {
    const tx = makeTransaction({ description: undefined });
    expect(getTransactionDisplayName(tx, { categoryName: 'Comida' })).toBe(
      'Comida'
    );
  });

  test('falls back to counterpartyName when description and categoryName are missing', () => {
    const tx = makeTransaction({
      description: undefined,
      counterpartyName: 'Juan Pérez',
    });
    expect(getTransactionDisplayName(tx)).toBe('Juan Pérez');
  });

  test('falls back to default when nothing is available', () => {
    const tx = makeTransaction({ description: undefined });
    expect(getTransactionDisplayName(tx)).toBe(
      DEFAULT_TRANSACTION_DISPLAY_NAME
    );
  });

  test('uses custom fallback when provided', () => {
    const tx = makeTransaction({ description: undefined });
    expect(getTransactionDisplayName(tx, { fallback: 'Sin descripción' })).toBe(
      'Sin descripción'
    );
  });

  test('prefers description over categoryName and counterpartyName', () => {
    const tx = makeTransaction({
      description: 'Real description',
      counterpartyName: 'Juan',
    });
    expect(getTransactionDisplayName(tx, { categoryName: 'Comida' })).toBe(
      'Real description'
    );
  });

  test('ignores empty string description and falls back', () => {
    const tx = makeTransaction({ description: '' });
    expect(getTransactionDisplayName(tx, { categoryName: 'Comida' })).toBe(
      'Comida'
    );
  });

  test('ignores whitespace-only description and falls back', () => {
    const tx = makeTransaction({ description: '   ' });
    expect(getTransactionDisplayName(tx)).toBe(
      DEFAULT_TRANSACTION_DISPLAY_NAME
    );
  });
});
