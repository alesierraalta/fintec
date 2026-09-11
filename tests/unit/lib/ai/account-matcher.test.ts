import {
  detectBankKey,
  matchReceiptAccounts,
} from '@/lib/ai/receipt-scanner/account-matcher';
import type { AccountCandidate } from '@/lib/ai/receipt-scanner/types';

describe('detectBankKey', () => {
  it('detects Venezuelan banks from raw text', () => {
    expect(detectBankKey('Pago Móvil Banesco Banco Universal')).toBe('banesco');
    expect(detectBankKey('Banco de Venezuela - Operación exitosa')).toBe('bdv');
    expect(detectBankKey('Mercantil en Línea')).toBe('mercantil');
    expect(detectBankKey('BBVA Provincial')).toBe('provincial');
    expect(detectBankKey('Banco Nacional de Crédito BNC')).toBe('bnc');
    expect(detectBankKey('Bancaribe Móvil')).toBe('bancaribe');
    expect(detectBankKey('Bancamiga Pago Móvil')).toBe('bancamiga');
  });

  it('detects crypto and international platforms', () => {
    expect(detectBankKey('Binance P2P Order #293847291')).toBe('binance');
    expect(detectBankKey('Zelle payment received')).toBe('zelle');
    expect(detectBankKey('Zinli Visa Card')).toBe('zinli');
  });

  it('returns null for unknown platforms', () => {
    expect(detectBankKey('Plataforma Desconocida XYZ')).toBeNull();
    expect(detectBankKey('')).toBeNull();
    expect(detectBankKey(undefined)).toBeNull();
  });
});

describe('matchReceiptAccounts', () => {
  const accounts: AccountCandidate[] = [
    { id: 'acc-banesco-ves', name: 'Banesco Corriente', currencyCode: 'VES' },
    { id: 'acc-bdv-ves', name: 'BDV Ahorro', currencyCode: 'VES' },
    { id: 'acc-binance-usd', name: 'Binance USDT', currencyCode: 'USD' },
    { id: 'acc-cash-usd', name: 'Efectivo Dólares', currencyCode: 'USD' },
  ];

  it('auto-selects with HIGH confidence when only 1 account exists in that currency', () => {
    const singleVesAccounts: AccountCandidate[] = [
      {
        id: 'acc-banesco-ves',
        name: 'Mi Cuenta Única en Bolívares',
        currencyCode: 'VES',
      },
      { id: 'acc-cash-usd', name: 'Efectivo', currencyCode: 'USD' },
    ];

    const result = matchReceiptAccounts(
      {
        type: 'EXPENSE',
        currency: 'VES',
        paymentMethod: 'Pago Móvil',
      },
      singleVesAccounts
    );

    expect(result.confidence).toBe('HIGH');
    expect(result.suggestedAccountId).toBe('acc-banesco-ves');
    expect(result.reason).toContain('única cartera en VES');
  });

  it('distinguishes between multiple accounts in the same currency using bank keywords', () => {
    const resultBanesco = matchReceiptAccounts(
      {
        type: 'EXPENSE',
        currency: 'VES',
        bankOrPlatform: 'Banesco',
        paymentMethod: 'Pago Móvil',
      },
      accounts
    );

    expect(resultBanesco.confidence).toBe('HIGH');
    expect(resultBanesco.suggestedAccountId).toBe('acc-banesco-ves');
    expect(resultBanesco.reason).toContain('Banesco');

    const resultBDV = matchReceiptAccounts(
      {
        type: 'INCOME',
        currency: 'VES',
        bankOrPlatform: 'Banco de Venezuela',
        paymentMethod: 'Pago Móvil',
      },
      accounts
    );

    expect(resultBDV.confidence).toBe('HIGH');
    expect(resultBDV.suggestedAccountId).toBe('acc-bdv-ves');
  });

  it('marks as AMBIGUOUS and lists candidates when multiple accounts exist and bank is unknown', () => {
    const result = matchReceiptAccounts(
      {
        type: 'EXPENSE',
        currency: 'VES',
        bankOrPlatform: 'Comercio X', // No bank information
      },
      accounts
    );

    expect(result.confidence).toBe('AMBIGUOUS');
    expect(result.candidateIds).toEqual(['acc-banesco-ves', 'acc-bdv-ves']);
    expect(result.reason).toContain('tienes 2 carteras');
  });

  it('correctly maps source and target accounts for TRANSFER / Binance P2P exchange', () => {
    const result = matchReceiptAccounts(
      {
        type: 'TRANSFER',
        currency: 'USD',
        targetCurrency: 'VES',
        bankOrPlatform: 'Binance',
        paymentMethod: 'Binance P2P',
        counterparty: {
          bank: 'Banesco',
        },
      },
      accounts
    );

    expect(result.confidence).toBe('HIGH');
    expect(result.suggestedAccountId).toBe('acc-binance-usd');
    expect(result.suggestedToAccountId).toBe('acc-banesco-ves');
    expect(result.reason).toContain('Transferencia detectada de USD a VES');
  });

  it('handles empty account list gracefully', () => {
    const result = matchReceiptAccounts(
      {
        type: 'EXPENSE',
        currency: 'VES',
      },
      []
    );

    expect(result.confidence).toBe('NONE');
    expect(result.suggestedAccountId).toBeUndefined();
  });
});
