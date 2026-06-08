import type { Transaction, TransactionType, DebtDirection, DebtStatus } from '@/types';

/**
 * Filters for querying transactions.
 */
export interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * DTO for creating a new transaction.
 * Aligns with domain CreateTransactionDTO.
 */
export interface CreateTransactionDTO {
  accountId: string;
  amountMinor: number;
  currencyCode: string;
  type: TransactionType;
  exchangeRate?: number;
  categoryId?: string;
  description?: string;
  note?: string;
  tags?: string[];
  isDebt?: boolean;
  debtDirection?: DebtDirection;
  debtStatus?: DebtStatus;
  counterpartyName?: string;
  settledAt?: string;
  date: string;
}

/**
 * DTO for updating an existing transaction.
 * Aligns with domain UpdateTransactionDTO (requires id).
 */
export interface UpdateTransactionDTO {
  id: string;
  description?: string;
  note?: string;
  tags?: string[];
  categoryId?: string;
  amountMinor?: number;
  exchangeRate?: number;
  debtStatus?: DebtStatus;
  settledAt?: string;
}

/**
 * Category breakdown in monthly report.
 */
export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
}

/**
 * Monthly financial report.
 */
export interface MonthlyReport {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  byCategory: CategoryBreakdown[];
}

/**
 * TransactionService interface.
 *
 * Defines the business logic layer for transactions.
 * Extracts validation, authorization, and cross-entity orchestration
 * from API routes into a testable service layer.
 *
 * All methods require userId for authorization checks.
 */
export interface ITransactionService {
  /**
   * Fetch transactions for a user with optional filters.
   */
  findAll(userId: string, filters?: TransactionFilters): Promise<Transaction[]>;

  /**
   * Fetch a single transaction by ID, ensuring it belongs to the user.
   */
  findById(userId: string, id: string): Promise<Transaction | null>;

  /**
   * Create a new transaction with business validation.
   */
  create(userId: string, dto: CreateTransactionDTO): Promise<Transaction>;

  /**
   * Update an existing transaction.
   */
  update(userId: string, id: string, dto: UpdateTransactionDTO): Promise<Transaction>;

  /**
   * Delete a transaction (soft delete recommended).
   */
  remove(userId: string, id: string): Promise<void>;

  /**
   * Generate a monthly financial report.
   */
  getMonthlyReport(userId: string, year: number, month: number): Promise<MonthlyReport>;
}
