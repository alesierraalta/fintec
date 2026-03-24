import {
  exportTransactionsToCSV,
  exportAccountsToCSV,
  exportCategoriesToCSV,
  exportMonthlyReportToCSV,
  downloadCSV,
} from '../../../lib/csv';
import { Transaction, Account, Category } from '@/types';
import { DebtStatus } from '@/types';

// Mock the download function to not fail in Jest DOM
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

describe('csv utils', () => {
  const mockCategories: Category[] = [
    {
      id: 'c1',
      name: 'Food',
      kind: 'EXPENSE',
      color: '#000000',
      icon: 'food',
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    },
  ];

  const mockAccounts: Account[] = [
    {
      id: 'a1',
      name: 'Main Bank',
      type: 'BANK',
      currencyCode: 'USD',
      balance: 10000,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: 1,
      deleted: false,
      isDefault: true,
    },
    {
      id: 'a2',
      name: 'Card',
      type: 'CARD',
      currencyCode: 'USD',
      balance: 10000,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: 1,
      deleted: false,
      isDefault: false,
    },
    {
      id: 'a3',
      name: 'Invest',
      type: 'INVESTMENT',
      currencyCode: 'USD',
      balance: 10000,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: 1,
      deleted: false,
      isDefault: false,
    },
    {
      id: 'a4',
      name: 'Save',
      type: 'SAVINGS',
      currencyCode: 'USD',
      balance: 10000,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: 1,
      deleted: false,
      isDefault: false,
    },
    {
      id: 'a5',
      name: 'Cash',
      type: 'CASH',
      currencyCode: 'USD',
      balance: 10000,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: 1,
      deleted: false,
      isDefault: false,
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 't1',
      type: 'EXPENSE',
      accountId: 'a1',
      categoryId: 'c1',
      amountMinor: 1000,
      amountBaseMinor: 1000,
      currencyCode: 'USD',
      exchangeRate: 1,
      date: '2026-03-23',
      description: 'Test Lunch',
      note: 'Note with, comma',
      tags: ['test'],
      isDebt: false,
      createdAt: '2026-03-23T12:00:00Z',
      updatedAt: '2026-03-23T12:00:00Z',
      version: 1,
      deleted: false,
    },
    {
      id: 't2',
      type: 'INCOME',
      accountId: 'a1',
      amountMinor: 1000,
      amountBaseMinor: 1000,
      currencyCode: 'USD',
      exchangeRate: 1,
      date: '2026-03-23',
      description: 'desc',
      isDebt: false,
      createdAt: '2026-03-23T12:00:00Z',
      updatedAt: '2026-03-23T12:00:00Z',
      version: 1,
      deleted: false,
    },
    {
      id: 't3',
      type: 'TRANSFER_OUT',
      accountId: 'a1',
      amountMinor: 1000,
      amountBaseMinor: 1000,
      currencyCode: 'USD',
      exchangeRate: 1,
      date: '2026-03-23',
      description: 'desc',
      isDebt: false,
      createdAt: '2026-03-23T12:00:00Z',
      updatedAt: '2026-03-23T12:00:00Z',
      version: 1,
      deleted: false,
    },
    {
      id: 't4',
      type: 'TRANSFER_IN',
      accountId: 'a1',
      amountMinor: 1000,
      amountBaseMinor: 1000,
      currencyCode: 'USD',
      exchangeRate: 1,
      date: '2026-03-23',
      description: 'desc',
      isDebt: false,
      createdAt: '2026-03-23T12:00:00Z',
      updatedAt: '2026-03-23T12:00:00Z',
      version: 1,
      deleted: false,
    },
  ];

  describe('exportTransactionsToCSV', () => {
    it('creates CSV with basic data', () => {
      const csv = exportTransactionsToCSV(
        mockTransactions,
        mockAccounts,
        mockCategories,
        { locale: 'en-US' }
      );
      expect(csv).toContain('Fecha,Tipo,Cuenta,Categoría,Descripción');
      expect(csv).toContain('Test Lunch');
      expect(csv).toContain('Main Bank');
      expect(csv).toContain('Food');
      expect(csv).toContain('"Note with, comma"'); // escaped separator
      expect(csv).toContain('Gasto');
    });

    it('handles different currency formats', () => {
      const csvCode = exportTransactionsToCSV(
        mockTransactions,
        mockAccounts,
        mockCategories,
        { currencyFormat: 'code' }
      );
      expect(csvCode).toContain('10 USD');

      const csvBoth = exportTransactionsToCSV(
        mockTransactions,
        mockAccounts,
        mockCategories,
        { currencyFormat: 'both' }
      );
      expect(csvBoth).toContain(' USD');
    });

    it('falls back when account or category is missing', () => {
      const transactionsWithMissingDeps = [
        { ...mockTransactions[0], accountId: 'missing', categoryId: 'missing' },
      ];
      const csv = exportTransactionsToCSV(
        transactionsWithMissingDeps,
        mockAccounts,
        mockCategories
      );
      expect(csv).toContain('Cuenta eliminada');
      expect(csv).toContain('Categoría eliminada');
    });
  });

  describe('exportAccountsToCSV', () => {
    it('creates CSV for accounts', () => {
      const csv = exportAccountsToCSV(mockAccounts, { locale: 'en-US' });
      expect(csv).toContain('Nombre,Tipo,Moneda,Saldo,Estado');
      expect(csv).toContain('Main Bank');
      expect(csv).toContain('Banco');
      expect(csv).toContain('USD');
      expect(csv).toContain('Activa');
    });

    it('handles currency formatting', () => {
      const csvCode = exportAccountsToCSV(mockAccounts, {
        currencyFormat: 'code',
      });
      expect(csvCode).toContain('100 USD');

      const csvBoth = exportAccountsToCSV(mockAccounts, {
        currencyFormat: 'both',
      });
      expect(csvBoth).toContain(' USD');
    });
  });

  describe('exportCategoriesToCSV', () => {
    it('creates CSV for categories', () => {
      const csv = exportCategoriesToCSV(mockCategories);
      expect(csv).toContain('Nombre,Tipo,Color,Icono');
      expect(csv).toContain('Food');
      expect(csv).toContain('Gasto');
      expect(csv).toContain('#000000');
    });
  });

  describe('exportMonthlyReportToCSV', () => {
    const mockReportData = {
      month: '2026-03',
      totalIncomeBaseMinor: 50000,
      totalExpenseBaseMinor: 20000,
      netBaseMinor: 30000,
      categoryBreakdown: [
        {
          categoryName: 'Food',
          totalBaseMinor: 20000,
          transactionCount: 5,
          percentage: 100,
        },
      ],
    };

    it('creates CSV for monthly report', () => {
      const csv = exportMonthlyReportToCSV(mockReportData, 'USD', {
        locale: 'en-US',
      });
      expect(csv).toContain('Resumen del Mes');
      expect(csv).toContain('Total Ingresos');
      expect(csv).toContain('200.00'); // total expense or food
      expect(csv).toContain('Food');
      expect(csv).toContain('100.0%');
    });
  });

  describe('downloadCSV', () => {
    it('creates anchor element and triggers click', () => {
      const appendChildSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation();
      const removeChildSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation();

      // We can't easily assert the click method on the created element,
      // but we can ensure no errors are thrown during the execution
      expect(() => downloadCSV('content', 'test.csv')).not.toThrow();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
