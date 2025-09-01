import { 
  RecurringTransaction, 
  CreateRecurringTransactionDTO, 
  UpdateRecurringTransactionDTO,
  RecurringTransactionSummary 
} from '@/types/recurring-transactions';

export interface RecurringTransactionsRepository {
  /**
   * Find all recurring transactions for a user
   */
  findByUserId(userId: string): Promise<RecurringTransaction[]>;

  /**
   * Find a specific recurring transaction by ID
   */
  findById(id: string): Promise<RecurringTransaction | null>;

  /**
   * Find active recurring transactions that are due for execution
   */
  findDueForExecution(date?: string): Promise<RecurringTransaction[]>;

  /**
   * Create a new recurring transaction
   */
  create(data: CreateRecurringTransactionDTO, userId: string): Promise<RecurringTransaction>;

  /**
   * Update an existing recurring transaction
   */
  update(id: string, data: UpdateRecurringTransactionDTO): Promise<RecurringTransaction>;

  /**
   * Delete a recurring transaction
   */
  delete(id: string): Promise<void>;

  /**
   * Toggle active status of a recurring transaction
   */
  toggleActive(id: string, isActive: boolean): Promise<RecurringTransaction>;

  /**
   * Get summary statistics for user's recurring transactions
   */
  getSummary(userId: string): Promise<RecurringTransactionSummary>;

  /**
   * Create a recurring transaction from an existing transaction
   */
  createFromTransaction(
    transactionId: string, 
    frequency: string, 
    intervalCount?: number, 
    endDate?: string,
    name?: string
  ): Promise<RecurringTransaction>;

  /**
   * Update the next execution date after processing
   */
  updateNextExecution(id: string, nextDate: string): Promise<void>;
}



