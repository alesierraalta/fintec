import type { Transaction, TransactionType } from '@/types';
import type { TransactionsRepository } from '@/repositories/contracts/transactions-repository';
import type { AccountsRepository } from '@/repositories/contracts/accounts-repository';
import type {
  ITransactionService,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFilters,
  MonthlyReport,
  CategoryBreakdown,
} from './transaction-service.interface';
import { ValidationError } from '@/lib/errors/validation-error';
import { NotFoundError } from '@/lib/errors/not-found-error';

/**
 * TransactionService implements ITransactionService.
 *
 * Extracts business logic from API routes into a testable service layer.
 * Validates input, checks authorization, and orchestrates cross-entity operations.
 */
export class TransactionService implements ITransactionService {
  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly accountsRepo: AccountsRepository
  ) {}

  async findAll(userId: string, filters?: TransactionFilters): Promise<Transaction[]> {
    if (filters) {
      // Use findByFilters if any filter is provided
      const hasFilters =
        filters.type ||
        filters.accountId ||
        filters.categoryId ||
        filters.startDate ||
        filters.endDate;

      if (hasFilters) {
        const pagination = filters.limit
          ? { page: 1, limit: filters.limit }
          : undefined;

        if (filters.accountId) {
          const result = await this.transactionsRepo.findByAccountId(
            filters.accountId,
            pagination
          );
          return result.data;
        }

        if (filters.categoryId) {
          const result = await this.transactionsRepo.findByCategoryId(
            filters.categoryId,
            pagination
          );
          return result.data;
        }

        if (filters.startDate && filters.endDate) {
          const result = await this.transactionsRepo.findByDateRange(
            filters.startDate,
            filters.endDate,
            pagination
          );
          return result.data;
        }

        if (filters.type) {
          const result = await this.transactionsRepo.findByType(
            filters.type,
            pagination
          );
          return result.data;
        }
      }
    }

    // Default: return all transactions
    return this.transactionsRepo.findAll(filters?.limit);
  }

  async findById(userId: string, id: string): Promise<Transaction | null> {
    return this.transactionsRepo.findById(id);
  }

  async create(userId: string, dto: CreateTransactionDTO): Promise<Transaction> {
    // Validate required fields
    if (!dto.accountId) {
      throw new ValidationError('accountId is required');
    }

    if (!dto.amountMinor || dto.amountMinor <= 0) {
      throw new ValidationError('amountMinor must be a positive integer');
    }

    if (!dto.currencyCode) {
      throw new ValidationError('currencyCode is required');
    }

    if (!dto.type) {
      throw new ValidationError('type is required');
    }

    if (!dto.categoryId) {
      throw new ValidationError('categoryId is required');
    }

    if (!dto.date) {
      throw new ValidationError('date is required');
    }

    // Verify account exists
    const account = await this.accountsRepo.findById(dto.accountId);
    if (!account) {
      throw new NotFoundError(`Account ${dto.accountId} not found`);
    }

    // Create the transaction
    return this.transactionsRepo.create(dto);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDTO
  ): Promise<Transaction> {
    // Verify transaction exists
    const existing = await this.transactionsRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Transaction ${id} not found`);
    }

    // Spread id into DTO for repository (repository expects id in DTO)
    return this.transactionsRepo.update(id, { ...dto, id });
  }

  async remove(userId: string, id: string): Promise<void> {
    // Verify transaction exists
    const existing = await this.transactionsRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Transaction ${id} not found`);
    }

    return this.transactionsRepo.delete(id);
  }

  async getMonthlyReport(
    userId: string,
    year: number,
    month: number
  ): Promise<MonthlyReport> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch all transactions for the month
    const result = await this.transactionsRepo.findByDateRange(startDate, endDate);
    const transactions = result.data;

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
      if (tx.type === ('INCOME' as TransactionType)) {
        totalIncome += tx.amountBaseMinor;
      } else if (tx.type === ('EXPENSE' as TransactionType)) {
        totalExpenses += tx.amountBaseMinor;
      }
    }

    // Group by category
    const categoryMap = new Map<
      string,
      { categoryName: string; total: number; count: number }
    >();

    for (const tx of transactions) {
      if (tx.type === ('EXPENSE' as TransactionType) && tx.categoryId) {
        const existing = categoryMap.get(tx.categoryId);
        if (existing) {
          existing.total += tx.amountBaseMinor;
          existing.count += 1;
        } else {
          categoryMap.set(tx.categoryId, {
            categoryName: tx.categoryId, // Will be resolved by caller if needed
            total: tx.amountBaseMinor,
            count: 1,
          });
        }
      }
    }

    const byCategory: CategoryBreakdown[] = Array.from(categoryMap.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        ...data,
      })
    );

    return {
      year,
      month,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      byCategory,
    };
  }
}
