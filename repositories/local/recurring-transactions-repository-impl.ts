import { RecurringTransactionsRepository } from '@/repositories/contracts/recurring-transactions-repository';
import { 
  RecurringTransaction, 
  CreateRecurringTransactionDTO, 
  UpdateRecurringTransactionDTO,
  RecurringTransactionSummary 
} from '@/types/recurring-transactions';

export class LocalRecurringTransactionsRepository implements RecurringTransactionsRepository {
  async findByUserId(userId: string): Promise<RecurringTransaction[]> {
    // Stub implementation - return empty array
    return [];
  }

  async findById(id: string): Promise<RecurringTransaction | null> {
    // Stub implementation - return null
    return null;
  }

  async findDueForExecution(date?: string): Promise<RecurringTransaction[]> {
    // Stub implementation - return empty array
    return [];
  }

  async create(data: CreateRecurringTransactionDTO, userId: string): Promise<RecurringTransaction> {
    // Stub implementation - throw error since local storage doesn't support this yet
    throw new Error('Recurring transactions not supported in local repository');
  }

  async update(id: string, data: UpdateRecurringTransactionDTO): Promise<RecurringTransaction> {
    // Stub implementation - throw error since local storage doesn't support this yet
    throw new Error('Recurring transactions not supported in local repository');
  }

  async delete(id: string): Promise<void> {
    // Stub implementation - do nothing
    return;
  }

  async toggleActive(id: string, isActive: boolean): Promise<RecurringTransaction> {
    // Stub implementation - throw error since local storage doesn't support this yet
    throw new Error('Recurring transactions not supported in local repository');
  }

  async getSummary(userId: string): Promise<RecurringTransactionSummary> {
    // Stub implementation - return empty summary
    return {
      totalActive: 0,
      totalInactive: 0,
      nextExecutions: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
      byFrequency: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0,
      },
    };
  }

  async createFromTransaction(
    transactionId: string, 
    frequency: string, 
    intervalCount?: number, 
    endDate?: string,
    name?: string
  ): Promise<RecurringTransaction> {
    // Stub implementation - throw error since local storage doesn't support this yet
    throw new Error('Recurring transactions not supported in local repository');
  }

  async updateNextExecution(id: string, nextDate: string): Promise<void> {
    // Stub implementation - do nothing
    return;
  }
}
