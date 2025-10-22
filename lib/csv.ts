// CSV export utilities for financial data

import { Transaction, Account, Category } from '@/types';
import { formatCurrency, fromMinorUnits } from './money';
import { formatDate } from './dates';

// CSV export configuration
export interface CSVExportConfig {
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  currencyFormat?: 'symbol' | 'code' | 'both';
  locale?: string;
}

// Default CSV configuration
const DEFAULT_CONFIG: Required<CSVExportConfig> = {
  delimiter: ',',
  includeHeaders: true,
  dateFormat: 'DISPLAY_SHORT',
  currencyFormat: 'symbol',
  locale: 'es-ES',
};

// Escape CSV field if it contains special characters
function escapeCSVField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  const str = String(field);
  
  // If field contains delimiter, quotes, or newlines, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

// Convert array of objects to CSV string
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: string[],
  config: Required<CSVExportConfig>
): string {
  const lines: string[] = [];
  
  // Add headers if requested
  if (config.includeHeaders) {
    lines.push(headers.map(header => escapeCSVField(header)).join(config.delimiter));
  }
  
  // Add data rows
  for (const item of data) {
    const row = headers.map(header => escapeCSVField(item[header]));
    lines.push(row.join(config.delimiter));
  }
  
  return lines.join('\n');
}

// Export transactions to CSV
export function exportTransactionsToCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  config: CSVExportConfig = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Create lookup maps for better performance
  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  
  // Transform transactions for CSV export
  const csvData = transactions.map(transaction => {
    const account = accountMap.get(transaction.accountId);
    const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : null;
    
    let formattedAmount: string;
    switch (finalConfig.currencyFormat) {
      case 'symbol':
        formattedAmount = formatCurrency(transaction.amountMinor, transaction.currencyCode, {
          showSymbol: true,
          showCode: false,
          locale: finalConfig.locale,
        });
        break;
      case 'code':
        formattedAmount = `${fromMinorUnits(transaction.amountMinor, transaction.currencyCode)} ${transaction.currencyCode}`;
        break;
      case 'both':
        formattedAmount = formatCurrency(transaction.amountMinor, transaction.currencyCode, {
          showSymbol: true,
          showCode: true,
          locale: finalConfig.locale,
        });
        break;
    }
    
    return {
      'Fecha': formatDate(transaction.date, finalConfig.dateFormat),
      'Tipo': getTransactionTypeLabel(transaction.type),
      'Cuenta': account?.name || 'Cuenta eliminada',
      'Categoría': category?.name || (transaction.categoryId ? 'Categoría eliminada' : 'Sin categoría'),
      'Descripción': transaction.description || '',
      'Nota': transaction.note || '',
      'Monto': formattedAmount,
      'Moneda': transaction.currencyCode,
      'Monto en Moneda Base': formatCurrency(transaction.amountBaseMinor, 'USD', {
        showSymbol: true,
        showCode: false,
        locale: finalConfig.locale,
      }),
      'Tasa de Cambio': transaction.exchangeRate.toFixed(6),
      'Etiquetas': transaction.tags?.join('; ') || '',
      'ID Transferencia': transaction.transferId || '',
      'Fecha de Creación': formatDate(transaction.createdAt, finalConfig.dateFormat),
    };
  });
  
  const headers = [
    'Fecha', 'Tipo', 'Cuenta', 'Categoría', 'Descripción', 'Nota',
    'Monto', 'Moneda', 'Monto en Moneda Base', 'Tasa de Cambio',
    'Etiquetas', 'ID Transferencia', 'Fecha de Creación'
  ];
  
  return arrayToCSV(csvData, headers, finalConfig);
}

// Export accounts to CSV
export function exportAccountsToCSV(
  accounts: Account[],
  config: CSVExportConfig = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const csvData = accounts.map(account => {
    let formattedBalance: string;
    switch (finalConfig.currencyFormat) {
      case 'symbol':
        formattedBalance = formatCurrency(account.balance, account.currencyCode, {
          showSymbol: true,
          showCode: false,
          locale: finalConfig.locale,
        });
        break;
      case 'code':
        formattedBalance = `${fromMinorUnits(account.balance, account.currencyCode)} ${account.currencyCode}`;
        break;
      case 'both':
        formattedBalance = formatCurrency(account.balance, account.currencyCode, {
          showSymbol: true,
          showCode: true,
          locale: finalConfig.locale,
        });
        break;
    }
    
    return {
      'Nombre': account.name,
      'Tipo': getAccountTypeLabel(account.type),
      'Moneda': account.currencyCode,
      'Saldo': formattedBalance,
      'Estado': account.active ? 'Activa' : 'Inactiva',
      'Fecha de Creación': formatDate(account.createdAt, finalConfig.dateFormat),
      'Última Actualización': formatDate(account.updatedAt, finalConfig.dateFormat),
    };
  });
  
  const headers = [
    'Nombre', 'Tipo', 'Moneda', 'Saldo', 'Estado',
    'Fecha de Creación', 'Última Actualización'
  ];
  
  return arrayToCSV(csvData, headers, finalConfig);
}

// Export categories to CSV
export function exportCategoriesToCSV(
  categories: Category[],
  config: CSVExportConfig = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const csvData = categories.map(category => ({
    'Nombre': category.name,
    'Tipo': category.kind === 'INCOME' ? 'Ingreso' : 'Gasto',
    'Color': category.color,
    'Icono': category.icon,
    'Categoría Padre': category.parentId || '',
    'Estado': category.active ? 'Activa' : 'Inactiva',
    'Fecha de Creación': formatDate(category.createdAt, finalConfig.dateFormat),
    'Última Actualización': formatDate(category.updatedAt, finalConfig.dateFormat),
  }));
  
  const headers = [
    'Nombre', 'Tipo', 'Color', 'Icono', 'Categoría Padre',
    'Estado', 'Fecha de Creación', 'Última Actualización'
  ];
  
  return arrayToCSV(csvData, headers, finalConfig);
}

// Export monthly report to CSV
export function exportMonthlyReportToCSV(
  reportData: {
    month: string;
    totalIncomeBaseMinor: number;
    totalExpenseBaseMinor: number;
    netBaseMinor: number;
    categoryBreakdown: Array<{
      categoryName: string;
      totalBaseMinor: number;
      transactionCount: number;
      percentage: number;
    }>;
  },
  baseCurrency: string = 'USD',
  config: CSVExportConfig = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Summary data
  const summaryData = [{
    'Mes': reportData.month,
    'Total Ingresos': formatCurrency(reportData.totalIncomeBaseMinor, baseCurrency, {
      showSymbol: true,
      showCode: false,
      locale: finalConfig.locale,
    }),
    'Total Gastos': formatCurrency(reportData.totalExpenseBaseMinor, baseCurrency, {
      showSymbol: true,
      showCode: false,
      locale: finalConfig.locale,
    }),
    'Balance Neto': formatCurrency(reportData.netBaseMinor, baseCurrency, {
      showSymbol: true,
      showCode: false,
      locale: finalConfig.locale,
    }),
  }];
  
  const summaryHeaders = ['Mes', 'Total Ingresos', 'Total Gastos', 'Balance Neto'];
  const summaryCSV = arrayToCSV(summaryData, summaryHeaders, finalConfig);
  
  // Category breakdown
  const categoryData = reportData.categoryBreakdown.map(category => ({
    'Categoría': category.categoryName,
    'Monto': formatCurrency(category.totalBaseMinor, baseCurrency, {
      showSymbol: true,
      showCode: false,
      locale: finalConfig.locale,
    }),
    'Transacciones': category.transactionCount.toString(),
    'Porcentaje': `${category.percentage.toFixed(1)}%`,
  }));
  
  const categoryHeaders = ['Categoría', 'Monto', 'Transacciones', 'Porcentaje'];
  const categoryCSV = arrayToCSV(categoryData, categoryHeaders, finalConfig);
  
  // Combine both sections
  return `Resumen del Mes\n${summaryCSV}\n\nDesglose por Categoría\n${categoryCSV}`;
}

// Get transaction type label in Spanish
function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case 'INCOME':
      return 'Ingreso';
    case 'EXPENSE':
      return 'Gasto';
    case 'TRANSFER_OUT':
      return 'Transferencia Salida';
    case 'TRANSFER_IN':
      return 'Transferencia Entrada';
    default:
      return type;
  }
}

// Get account type label in Spanish
function getAccountTypeLabel(type: string): string {
  switch (type) {
    case 'CASH':
      return 'Efectivo';
    case 'BANK':
      return 'Banco';
    case 'CARD':
      return 'Tarjeta';
    case 'INVESTMENT':
      return 'Inversión';
    case 'SAVINGS':
      return 'Ahorro';
    default:
      return type;
  }
}

// Download CSV file in browser
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}
