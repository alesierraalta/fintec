import { TransactionsRepository } from '@/repositories/contracts';
import { 
  Transaction, 
  TransactionType, 
  TransactionFilters, 
  PaginationParams, 
  PaginatedResult,
  CreateTransactionDTO,
  UpdateTransactionDTO 
} from '@/types';
import { supabase } from './client';
import { 
  mapSupabaseTransactionToDomain, 
  mapDomainTransactionToSupabase,
  mapSupabaseTransactionArrayToDomain 
} from './mappers';

export class SupabaseTransactionsRepository implements TransactionsRepository {
  async findAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async findById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }

    return mapSupabaseTransactionToDomain(data);
  }

  async findByAccountId(accountId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by account: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async findByCategoryId(categoryId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('category_id', categoryId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by category: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async findByType(type: TransactionType): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', type)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by type: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by date range: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async findWithFilters(filters: TransactionFilters): Promise<Transaction[]> {
    let query = supabase.from('transactions').select('*');

    if (filters.accountIds && filters.accountIds.length > 0) {
      query = query.in('account_id', filters.accountIds);
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      query = query.in('category_id', filters.categoryIds);
    }

    if (filters.types && filters.types.length > 0) {
      query = query.in('type', filters.types);
    }

    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo);
    }

    if (filters.amountMin !== undefined) {
      query = query.gte('amount_base_minor', filters.amountMin);
    }

    if (filters.amountMax !== undefined) {
      query = query.lte('amount_base_minor', filters.amountMax);
    }

    if (filters.currencyCode) {
      query = query.eq('currency_code', filters.currencyCode);
    }

    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,note.ilike.%${filters.search}%`);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions with filters: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async findWithPagination(params: PaginationParams): Promise<PaginatedResult<Transaction>> {
    const { page, limit, sortBy = 'date', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count transactions: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .order('created_at', { ascending: false }) // Secondary sort
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: mapSupabaseTransactionArrayToDomain(data || []),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(transactionData: CreateTransactionDTO): Promise<Transaction> {
    // Convert DTO to full transaction object (let Supabase generate the ID)
    const transaction = {
      ...transactionData,
      amountBaseMinor: transactionData.amountMinor, // TODO: Apply exchange rate conversion
      exchangeRate: 1, // TODO: Get actual exchange rate
    };

    const supabaseTransaction = mapDomainTransactionToSupabase(transaction);

    const { data, error } = await supabase
      .from('transactions')
      .insert(supabaseTransaction)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    return mapSupabaseTransactionToDomain(data);
  }

  async update(id: string, updates: UpdateTransactionDTO): Promise<Transaction> {
    const { id: updateId, ...updateData } = updates;
    const supabaseUpdates = mapDomainTransactionToSupabase({
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('transactions')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    return mapSupabaseTransactionToDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count transactions: ${error.message}`);
    }

    return count || 0;
  }

  async getTotalByAccountId(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount_base_minor, type')
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`Failed to get account total: ${error.message}`);
    }

    return (data || []).reduce((total, transaction) => {
      const amount = transaction.amount_base_minor;
      if (transaction.type === 'INCOME' || transaction.type === 'TRANSFER_IN') {
        return total + amount;
      } else {
        return total - amount;
      }
    }, 0);
  }

  async getTotalByCategoryId(categoryId: string, dateFrom?: string, dateTo?: string): Promise<number> {
    let query = supabase
      .from('transactions')
      .select('amount_base_minor')
      .eq('category_id', categoryId);

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get category total: ${error.message}`);
    }

    return (data || []).reduce((total, transaction) => total + transaction.amount_base_minor, 0);
  }

  async getMonthlyTotals(year: number): Promise<{ month: number; income: number; expense: number }[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('transactions')
      .select('date, amount_base_minor, type')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      throw new Error(`Failed to get monthly totals: ${error.message}`);
    }

    // Group by month
    const monthlyData: { [month: number]: { income: number; expense: number } } = {};

    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = { income: 0, expense: 0 };
    }

    (data || []).forEach(transaction => {
      const month = new Date(transaction.date).getMonth() + 1;
      const amount = transaction.amount_base_minor;

      if (transaction.type === 'INCOME') {
        monthlyData[month].income += amount;
      } else if (transaction.type === 'EXPENSE') {
        monthlyData[month].expense += amount;
      }
    });

    return Object.entries(monthlyData).map(([month, totals]) => ({
      month: parseInt(month),
      income: totals.income,
      expense: totals.expense,
    }));
  }
}
