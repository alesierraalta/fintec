import { RecurringTransactionsRepository } from '../contracts/recurring-transactions-repository';
import { 
  RecurringTransaction, 
  CreateRecurringTransactionDTO, 
  UpdateRecurringTransactionDTO,
  RecurringTransactionSummary,
  RecurringFrequency
} from '@/types/recurring-transactions';
import { supabase } from './client';

export class SupabaseRecurringTransactionsRepository implements RecurringTransactionsRepository {

  async findByUserId(userId: string): Promise<RecurringTransaction[]> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch recurring transactions: ${error.message}`);
    }

    return data?.map(this.mapFromDatabase) || [];
  }

  async findById(id: string): Promise<RecurringTransaction | null> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch recurring transaction: ${error.message}`);
    }

    return data ? this.mapFromDatabase(data) : null;
  }

  async findDueForExecution(date?: string): Promise<RecurringTransaction[]> {
    const executionDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution_date', executionDate)
      .or(`end_date.is.null,end_date.gte.${executionDate}`);

    if (error) {
      throw new Error(`Failed to fetch due recurring transactions: ${error.message}`);
    }

    return data?.map(this.mapFromDatabase) || [];
  }

  async create(data: CreateRecurringTransactionDTO, userId: string): Promise<RecurringTransaction> {
    const insertData = {
      user_id: userId,
      name: data.name,
      type: data.type,
      account_id: data.accountId,
      category_id: data.categoryId,
      currency_code: data.currencyCode,
      amount_minor: data.amountMinor,
      description: data.description,
      note: data.note,
      tags: data.tags,
      frequency: data.frequency,
      interval_count: data.intervalCount || 1,
      start_date: data.startDate,
      end_date: data.endDate,
      next_execution_date: data.startDate, // First execution is the start date
      is_active: true
    };

    const { data: result, error } = await supabase
      .from('recurring_transactions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create recurring transaction: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  async update(id: string, data: UpdateRecurringTransactionDTO): Promise<RecurringTransaction> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.accountId !== undefined) updateData.account_id = data.accountId;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.currencyCode !== undefined) updateData.currency_code = data.currencyCode;
    if (data.amountMinor !== undefined) updateData.amount_minor = data.amountMinor;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.intervalCount !== undefined) updateData.interval_count = data.intervalCount;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: result, error } = await supabase
      .from('recurring_transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update recurring transaction: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete recurring transaction: ${error.message}`);
    }
  }

  async toggleActive(id: string, isActive: boolean): Promise<RecurringTransaction> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle recurring transaction: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async getSummary(userId: string): Promise<RecurringTransactionSummary> {
    const { data, error } = await supabase.rpc('get_recurring_transactions_summary', {
      user_id_input: userId,
    });

    if (error) {
      throw new Error(`Failed to get recurring transactions summary: ${error.message}`);
    }

    return data;
  }

  async createFromTransaction(
    transactionId: string, 
    frequency: string, 
    intervalCount: number = 1, 
    endDate?: string,
    name?: string
  ): Promise<RecurringTransaction> {
    const { data, error } = await supabase.rpc('create_recurring_from_transaction', {
      transaction_id: transactionId,
      frequency,
      interval_count: intervalCount,
      end_date: endDate,
      recurring_name: name
    });

    if (error) {
      throw new Error(`Failed to create recurring transaction from transaction: ${error.message}`);
    }

    // Fetch the created recurring transaction
    const recurringTransaction = await this.findById(data);
    if (!recurringTransaction) {
      throw new Error(`Failed to fetch created recurring transaction with id: ${data}`);
    }
    return recurringTransaction;
  }

  async updateNextExecution(id: string, nextDate: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ 
        next_execution_date: nextDate,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update next execution date: ${error.message}`);
    }
  }

  private mapFromDatabase(data: any): RecurringTransaction {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      type: data.type,
      accountId: data.account_id,
      categoryId: data.category_id,
      currencyCode: data.currency_code,
      amountMinor: data.amount_minor,
      description: data.description,
      note: data.note,
      tags: data.tags,
      frequency: data.frequency as RecurringFrequency,
      intervalCount: data.interval_count,
      startDate: data.start_date,
      endDate: data.end_date,
      nextExecutionDate: data.next_execution_date,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastExecutedAt: data.last_executed_at
    };
  }
}



