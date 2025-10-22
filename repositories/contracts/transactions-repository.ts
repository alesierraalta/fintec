import { 
  Transaction, 
  TransactionType, 
  TransactionFilters, 
  PaginatedResult, 
  PaginationParams,
  MonthlyReport,
  CashFlowData,
  CreateTransactionDTO,
  UpdateTransactionDTO
} from '@/types';
import { BaseRepository } from './base-repository';

export interface TransactionsRepository extends BaseRepository<Transaction, CreateTransactionDTO, UpdateTransactionDTO> {
  // Filtered queries
  findByFilters(filters: TransactionFilters, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>>;
  findByAccountId(accountId: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>>;
  findByCategoryId(categoryId: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>>;
  findByType(type: TransactionType, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>>;
  findByDateRange(startDate: string, endDate: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>>;
  
  // Transfer operations
  findByTransferId(transferId: string): Promise<Transaction[]>;
  
  // Search
  search(query: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>>;
  
  // Statistics and aggregations
  getTotalByType(type: TransactionType, startDate?: string, endDate?: string): Promise<number>;
  getTotalByCategory(categoryId: string, startDate?: string, endDate?: string): Promise<number>;
  getTotalByCategoryId(categoryId: string, dateFrom?: string, dateTo?: string): Promise<number>;
  getTotalByAccount(accountId: string, startDate?: string, endDate?: string): Promise<number>;
  
  // Monthly summaries
  getMonthlyReport(year: number, month: number): Promise<MonthlyReport>;
  getMonthlyReports(startMonth: string, endMonth: string): Promise<MonthlyReport[]>;
  
  // Cash flow data
  getCashFlowData(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month'): Promise<CashFlowData[]>;
  
  // Category breakdown
  getCategoryBreakdown(startDate: string, endDate: string, type?: TransactionType): Promise<{
    categoryId: string;
    categoryName: string;
    totalBaseMinor: number;
    transactionCount: number;
    percentage: number;
  }[]>;
  
  // Account breakdown
  getAccountBreakdown(startDate: string, endDate: string, type?: TransactionType): Promise<{
    accountId: string;
    accountName: string;
    totalBaseMinor: number;
    transactionCount: number;
  }[]>;
  
  // Bulk operations for transfers
  createTransfer(fromTransaction: CreateTransactionDTO, toTransaction: CreateTransactionDTO): Promise<{
    fromTransaction: Transaction;
    toTransaction: Transaction;
    transferId: string;
  }>;
  
  // Export
  exportToCSV(filters?: TransactionFilters): Promise<string>;
}
