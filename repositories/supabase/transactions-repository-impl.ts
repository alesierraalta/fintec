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
import { AccountsRepository } from '../contracts/accounts-repository';

export class SupabaseTransactionsRepository implements TransactionsRepository {
  private accountsRepository?: AccountsRepository;

  setAccountsRepository(accountsRepository: AccountsRepository) {
    this.accountsRepository = accountsRepository;
  }
  async findAll(limit: number = 1000): Promise<Transaction[]> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning empty transactions');
      return [];
    }
    
    const userId = user.id;

    // Single query with JOIN - más eficiente que 2 queries separados
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit); // Paginación por defecto para prevenir cargas masivas

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
    // Convert DTO and create atomically via RPC (insert + balance update)
    const transaction = {
      ...transactionData,
      amountBaseMinor: transactionData.amountMinor, // TODO: Apply exchange rate conversion
      exchangeRate: 1, // TODO: Get actual exchange rate
    };

    const supabaseTransaction = mapDomainTransactionToSupabase(transaction);

    const { data, error } = await (supabase as any).rpc('create_transaction_and_adjust_balance', {
      p_account_id: supabaseTransaction.account_id,
      p_category_id: supabaseTransaction.category_id,
      p_type: supabaseTransaction.type,
      p_currency_code: supabaseTransaction.currency_code,
      p_amount_minor: supabaseTransaction.amount_minor,
      p_amount_base_minor: supabaseTransaction.amount_base_minor,
      p_exchange_rate: supabaseTransaction.exchange_rate,
      p_date: supabaseTransaction.date,
      p_description: supabaseTransaction.description,
      p_note: supabaseTransaction.note ?? null,
      p_tags: supabaseTransaction.tags ?? null,
    });

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    const createdTransaction = mapSupabaseTransactionToDomain(data);
    return createdTransaction;
  }

  private calculateBalanceAdjustment(type: string, amountMinor: number): number {
    switch (type) {
      case 'INCOME':
      case 'TRANSFER_IN':
        return amountMinor; // Add to balance
      case 'EXPENSE':
      case 'TRANSFER_OUT':
        return -amountMinor; // Subtract from balance
      default:
        return 0;
    }
  }

  async update(id: string, updates: UpdateTransactionDTO): Promise<Transaction> {
    // Get the original transaction to calculate balance difference
    const originalTransaction = await this.findById(id);
    if (!originalTransaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    const { id: updateId, ...updateData } = updates;
    const supabaseUpdates = mapDomainTransactionToSupabase({
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await (supabase
      .from('transactions') as any)
      .update(supabaseUpdates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    const updatedTransaction = mapSupabaseTransactionToDomain(data);

    // Update account balance if amount or type changed
    try {
      const originalAdjustment = this.calculateBalanceAdjustment(originalTransaction.type, originalTransaction.amountMinor);
      const newAdjustment = this.calculateBalanceAdjustment(updatedTransaction.type, updatedTransaction.amountMinor);
      const balanceDifference = newAdjustment - originalAdjustment;
      
      if (balanceDifference !== 0 && this.accountsRepository) {
        await this.accountsRepository.adjustBalance(updatedTransaction.accountId, balanceDifference);
        console.log(`✅ Balance updated for account ${updatedTransaction.accountId}: ${balanceDifference > 0 ? '+' : ''}${balanceDifference / 100}`);
      }
    } catch (balanceError) {
      console.error('❌ Failed to update account balance on transaction update:', balanceError);
    }

    return updatedTransaction;
  }

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any).rpc('delete_transaction_and_adjust_balance', {
      transaction_id_input: id,
    });

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

    return ((data as any[]) || []).reduce((total, transaction: any) => {
      const amount = transaction.amount_base_minor;
      if (transaction.type === 'INCOME' || transaction.type === 'TRANSFER_IN') {
        return total + amount;
      } else {
        return total - amount;
      }
    }, 0);
  }

  async getTotalByCategoryId(categoryId: string, dateFrom?: string, dateTo?: string): Promise<number> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning 0 for category total');
      return 0;
    }
    
    const userId = user.id;

    // Single query with JOIN - más eficiente
    let query = supabase
      .from('transactions')
      .select(`
        amount_base_minor,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
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

    return ((data as any[]) || []).reduce((total, transaction: any) => total + (transaction?.amount_base_minor || 0), 0);
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

    ((data as any[]) || []).forEach((transaction: any) => {
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

  // Missing methods from TransactionsRepository interface - basic implementations
  async findByFilters(filters: TransactionFilters, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>> {
    // Use existing findWithFilters and add pagination
    const transactions = await this.findWithFilters(filters);
    
    if (!pagination) {
      return {
        data: transactions,
        total: transactions.length,
        page: 1,
        limit: transactions.length,
        totalPages: 1,
      };
    }

    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedItems = transactions.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      total: transactions.length,
      page,
      limit,
      totalPages: Math.ceil(transactions.length / limit),
    };
  }

  async findByAccountId(accountId: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning empty transactions');
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }
    
    const userId = user.id;

    // Verify that the account belongs to the authenticated user
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (!account) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      }; // Account doesn't belong to user or doesn't exist
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by account: ${error.message}`);
    }

    const transactions = mapSupabaseTransactionArrayToDomain(data || []);
    
    if (!pagination) {
      return {
        data: transactions,
        total: transactions.length,
        page: 1,
        limit: transactions.length,
        totalPages: 1,
      };
    }

    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedItems = transactions.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      total: transactions.length,
      page,
      limit,
      totalPages: Math.ceil(transactions.length / limit),
    };
  }

  async findByCategoryId(categoryId: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning empty transactions');
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }
    
    const userId = user.id;

    // Single query with JOIN - más eficiente
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .eq('category_id', categoryId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by category: ${error.message}`);
    }

    const transactions = mapSupabaseTransactionArrayToDomain(data || []);
    
    if (!pagination) {
      return {
        data: transactions,
        total: transactions.length,
        page: 1,
        limit: transactions.length,
        totalPages: 1,
      };
    }

    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedItems = transactions.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      total: transactions.length,
      page,
      limit,
      totalPages: Math.ceil(transactions.length / limit),
    };
  }

  async findByType(type: TransactionType, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning empty transactions');
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }
    
    const userId = user.id;

    // Single query with JOIN - más eficiente
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .eq('type', type)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by type: ${error.message}`);
    }

    const transactions = mapSupabaseTransactionArrayToDomain(data || []);
    
    if (!pagination) {
      return {
        data: transactions,
        total: transactions.length,
        page: 1,
        limit: transactions.length,
        totalPages: 1,
      };
    }

    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedItems = transactions.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      total: transactions.length,
      page,
      limit,
      totalPages: Math.ceil(transactions.length / limit),
    };
  }

  async findByDateRange(startDate: string, endDate: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning empty transactions');
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }
    
    const userId = user.id;

    // Single query with JOIN - más eficiente
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transactions by date range: ${error.message}`);
    }

    const transactions = mapSupabaseTransactionArrayToDomain(data || []);
    
    if (!pagination) {
      return {
        data: transactions,
        total: transactions.length,
        page: 1,
        limit: transactions.length,
        totalPages: 1,
      };
    }

    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedItems = transactions.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      total: transactions.length,
      page,
      limit,
      totalPages: Math.ceil(transactions.length / limit),
    };
  }

  async findByTransferId(transferId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transfer_id', transferId);

    if (error) {
      throw new Error(`Failed to fetch transactions by transfer ID: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async search(query: string, pagination?: PaginationParams): Promise<PaginatedResult<Transaction>> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`description.ilike.%${query}%,note.ilike.%${query}%`)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to search transactions: ${error.message}`);
    }

    const transactions = mapSupabaseTransactionArrayToDomain(data || []);
    
    if (!pagination) {
      return {
        data: transactions,
        total: transactions.length,
        page: 1,
        limit: transactions.length,
        totalPages: 1,
      };
    }

    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedItems = transactions.slice(offset, offset + limit);
    
    return {
      data: paginatedItems,
      total: transactions.length,
      page,
      limit,
      totalPages: Math.ceil(transactions.length / limit),
    };
  }

  async getTotalByType(type: TransactionType, startDate?: string, endDate?: string): Promise<number> {
    let query = supabase
      .from('transactions')
      .select('amount_base_minor')
      .eq('type', type);

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get total by type: ${error.message}`);
    }

    return ((data as any[]) || []).reduce((total, transaction: any) => total + (transaction?.amount_base_minor || 0), 0);
  }

  async getTotalByCategory(categoryId: string, startDate?: string, endDate?: string): Promise<number> {
    return this.getTotalByCategoryId(categoryId, startDate, endDate);
  }

  async getTotalByAccount(accountId: string, startDate?: string, endDate?: string): Promise<number> {
    let query = supabase
      .from('transactions')
      .select('amount_base_minor, type')
      .eq('account_id', accountId);

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get total by account: ${error.message}`);
    }

    return ((data as any[]) || []).reduce((total, transaction: any) => {
      const amount = transaction.amount_base_minor;
      if (transaction.type === 'INCOME' || transaction.type === 'TRANSFER_IN') {
        return total + amount;
      } else {
        return total - amount;
      }
    }, 0);
  }

  // Stub implementations for remaining complex methods
  async getMonthlyReport(year: number, month: number): Promise<any> {
    // TODO: Implement proper monthly report
    return {
      year,
      month,
      income: 0,
      expense: 0,
      balance: 0,
      transactions: [],
    };
  }

  async getMonthlyReports(startMonth: string, endMonth: string): Promise<any[]> {
    // TODO: Implement proper monthly reports
    return [];
  }

  async getCashFlowData(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month'): Promise<any[]> {
    // TODO: Implement proper cash flow data
    return [];
  }

  async getCategoryBreakdown(startDate: string, endDate: string, type?: TransactionType): Promise<any[]> {
    // TODO: Implement proper category breakdown
    return [];
  }

  async getAccountBreakdown(startDate: string, endDate: string, type?: TransactionType): Promise<any[]> {
    // TODO: Implement proper account breakdown
    return [];
  }

  async createTransfer(fromTransaction: CreateTransactionDTO, toTransaction: CreateTransactionDTO): Promise<any> {
    // TODO: Implement proper transfer creation
    const transferId = crypto.randomUUID();
        const from = await this.create({ ...fromTransaction, transferId } as any); 
    const to = await this.create({ ...toTransaction, transferId } as any);
    
    return {
      fromTransaction: from,
      toTransaction: to,
      transferId,
    };
  }

  async exportToCSV(filters?: TransactionFilters): Promise<string> {
    // TODO: Implement proper CSV export
    return 'CSV export not implemented';
  }

  // Missing BaseRepository methods
  async findPaginated(params: PaginationParams): Promise<PaginatedResult<Transaction>> {
    return this.findWithPagination(params);
  }

  async createMany(data: CreateTransactionDTO[]): Promise<Transaction[]> {
    const results: Transaction[] = [];
    
    for (const transactionData of data) {
      const result = await this.create(transactionData);
      results.push(result);
    }
    
    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to delete transactions: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const transaction = await this.findById(id);
    return transaction !== null;
  }
}
