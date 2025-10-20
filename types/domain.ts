// Domain models for personal finance application
// All monetary amounts are stored in minor units (e.g., cents for USD)

export interface User {
  id: string;
  email: string;
  name?: string;
  baseCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId?: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  balance: number; // in minor units
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // Balance alert settings
  minimumBalance?: number; // in minor units
  alertEnabled?: boolean;
}

export enum AccountType {
  CASH = 'CASH',
  BANK = 'BANK',
  CARD = 'CARD',
  INVESTMENT = 'INVESTMENT',
  SAVINGS = 'SAVINGS',
}

export interface Currency {
  code: string; // ISO 4217
  symbol: string;
  name: string;
  decimals: number;
  requiresBCVRate?: boolean; // For currencies that need BCV validation (like VES)
}

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  date: string; // ISO date
  provider: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  parentId?: string;
  active: boolean;
  userId: string | null; // null for default categories
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum CategoryKind {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  currencyCode: string;
  amountMinor: number; // Amount in transaction currency (minor units)
  amountBaseMinor: number; // Amount converted to base currency (minor units)
  exchangeRate: number; // Rate used for conversion
  date: string; // ISO date
  description?: string;
  note?: string;
  tags?: string[];
  transferId?: string; // Links to Transfer if this is a transfer transaction
  pending?: boolean; // Indicates if transaction is pending
  createdAt: string;
  updatedAt: string;
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
}

export interface Transfer {
  id: string;
  fromTransactionId: string;
  toTransactionId: string;
  feeMinor?: number; // Fee in base currency (minor units)
  exchangeRate?: number; // Rate used if different currencies
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  monthYYYYMM: string; // YYYYMM format
  amountBaseMinor: number; // Budget amount in base currency (minor units)
  spentMinor?: number; // Amount spent so far (calculated)
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetBaseMinor: number; // Target amount in base currency (minor units)
  currentBaseMinor: number; // Current saved amount (minor units)
  targetDate?: string; // ISO date
  accountId?: string; // Optional linked account
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRule {
  id: string;
  name: string;
  frequency: RecurrenceFrequency;
  interval: number; // Every N periods (e.g., every 2 weeks)
  nextRunDate: string; // ISO date
  endDate?: string; // ISO date
  template: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// DTOs for API operations
export interface CreateTransactionDTO {
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  currencyCode: string;
  amountMinor: number;
  date: string;
  description?: string;
  note?: string;
  tags?: string[];
}

export interface CreateTransferDTO {
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  currencyCode: string;
  date: string;
  description?: string;
  note?: string;
  feeMinor?: number;
}

export interface UpdateTransactionDTO extends Partial<CreateTransactionDTO> {
  id: string;
}

export interface TransactionFilters {
  accountIds?: string[];
  categoryIds?: string[];
  types?: TransactionType[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  currencyCode?: string;
  search?: string;
  tags?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Report types
export interface MonthlyReport {
  month: string; // YYYY-MM
  totalIncomeBaseMinor: number;
  totalExpenseBaseMinor: number;
  netBaseMinor: number;
  transactionCount: number;
  categoryBreakdown: CategorySummary[];
  accountBreakdown: AccountSummary[];
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  totalBaseMinor: number;
  transactionCount: number;
  percentage: number;
}

export interface AccountSummary {
  accountId: string;
  accountName: string;
  totalBaseMinor: number;
  transactionCount: number;
}

export interface CashFlowData {
  date: string;
  incomeBaseMinor: number;
  expenseBaseMinor: number;
  netBaseMinor: number;
  cumulativeBaseMinor: number;
}

// Settings
export interface AppSettings {
  baseCurrency: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  exchangeRateProvider: string;
  dateFormat: string;
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday
  notifications: {
    budgetAlerts: boolean;
    goalReminders: boolean;
    recurringTransactions: boolean;
  };
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  baseCurrency: string;
}
