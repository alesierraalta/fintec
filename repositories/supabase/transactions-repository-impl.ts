import { TransactionsRepository } from '@/repositories/contracts';
import {
  Transaction,
  TransactionType,
  TransactionFilters,
  PaginationParams,
  PaginatedResult,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  DebtDirection,
  DebtStatus,
  DebtSummary,
  DebtMode,
} from '@/types';
import { supabase } from './client';
import {
  mapSupabaseTransactionToDomain,
  mapDomainTransactionToSupabase,
  mapSupabaseTransactionArrayToDomain,
} from './mappers';
import {
  getOwnedAccountScope,
  hasOwnedAccounts,
  intersectOwnedAccountIds,
} from './account-scope';
import { AccountsRepository } from '../contracts/accounts-repository';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseTransactionsRepository implements TransactionsRepository {
  private accountsRepository?: AccountsRepository;
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  private async getUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user?.id || null;
  }

  private async getUserAccountIds(userId: string): Promise<string[]> {
    const scope = await getOwnedAccountScope(this.client, userId);
    return scope.accountIds;
  }

  private async ensureAccountOwned(
    accountId: string,
    userId: string
  ): Promise<void> {
    const { data, error } = await this.client
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new Error('Account not found');
    }
  }

  setAccountsRepository(accountsRepository: AccountsRepository) {
    this.accountsRepository = accountsRepository;
  }
  async findAll(limit: number = 1000): Promise<Transaction[]> {
    // Only allow authenticated users - no fallbacks
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning empty transactions');
      return [];
    }

    const userId = user.id;

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return [];
    }

    // * Payload Optimization: Select only essential fields for list view
    const { data, error } = await this.client
      .from('transactions')
      .select(
        `
        id, type, account_id, category_id, currency_code, amount_minor, amount_base_minor, exchange_rate, date, description, note, tags, transfer_id, is_debt, debt_direction, debt_status, counterparty_name, settled_at, created_at, updated_at
      `
      )
      .in('account_id', scope.accountIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit); // Paginación por defecto para prevenir cargas masivas

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async findById(id: string): Promise<Transaction | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return null;
    }

    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('id', id)
      .in('account_id', scope.accountIds)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }

    return mapSupabaseTransactionToDomain(data);
  }

  async findByFilters(
    filters: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
    } = pagination || {};
    const offset = (page - 1) * limit;

    const userId = await this.getUserId();
    if (!userId) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const scopedAccountIds = intersectOwnedAccountIds(
      scope.accountIds,
      filters.accountIds
    );
    if (scopedAccountIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    let query = this.client
      .from('transactions')
      .select('*', { count: 'exact' })
      .in('account_id', scopedAccountIds);

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
      query = query.or(
        `description.ilike.%${filters.search}%,note.ilike.%${filters.search}%`
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const debtMode = filters.debtMode as DebtMode | undefined;

    if (debtMode === 'ONLY_DEBT') {
      query = query.eq('is_debt', true);
    }

    if (debtMode === 'EXCLUDE_DEBT') {
      query = query.or('is_debt.eq.false,is_debt.is.null');
    }

    if (filters.debtDirection) {
      query = query.eq('debt_direction', filters.debtDirection);
    }

    if (filters.debtStatus === DebtStatus.OPEN) {
      query = query.or('debt_status.eq.OPEN,debt_status.is.null');
    } else if (filters.debtStatus === DebtStatus.SETTLED) {
      query = query.eq('debt_status', DebtStatus.SETTLED);
    }

    // Apply sorting and pagination
    const sortColumn =
      sortBy === 'createdAt'
        ? 'created_at'
        : sortBy === 'date'
          ? 'date'
          : 'date';

    query = query
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .order('created_at', { ascending: false }) // Secondary sort
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(
        `Failed to fetch transactions with filters: ${error.message}`
      );
    }

    return {
      data: mapSupabaseTransactionArrayToDomain(data || []),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  // Helper method kept for backward compatibility if needed internally, but finding filtered list should prefer findByFilters
  async findWithFilters(filters: TransactionFilters): Promise<Transaction[]> {
    const result = await this.findByFilters(filters, { page: 1, limit: 1000 });
    return result.data;
  }

  async create(transactionData: CreateTransactionDTO): Promise<Transaction> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Convert DTO and create atomically via RPC (insert + balance update)
    if (transactionData.isDebt === true && !transactionData.debtDirection) {
      throw new Error('debtDirection is required when isDebt=true');
    }

    if (
      transactionData.debtStatus === DebtStatus.SETTLED &&
      !transactionData.settledAt
    ) {
      throw new Error('settledAt is required when debtStatus=SETTLED');
    }

    const isVesCurrency = transactionData.currencyCode === 'VES';
    const exchangeRate = isVesCurrency ? transactionData.exchangeRate || 1 : 1;
    const amountBaseMinor = isVesCurrency
      ? Math.round(transactionData.amountMinor / exchangeRate)
      : transactionData.amountMinor;

    const transaction = {
      ...transactionData,
      isDebt: transactionData.isDebt === true,
      debtStatus:
        transactionData.isDebt === true
          ? transactionData.debtStatus || DebtStatus.OPEN
          : undefined,
      amountBaseMinor,
      exchangeRate,
    };

    const supabaseTransaction = mapDomainTransactionToSupabase(transaction);

    await this.ensureAccountOwned(
      supabaseTransaction.account_id as string,
      userId
    );

    if (supabaseTransaction.category_id) {
      const { data: category, error: categoryError } = await this.client
        .from('categories')
        .select('id, user_id, is_default')
        .eq('id', supabaseTransaction.category_id)
        .single();

      if (categoryError || !category) {
        throw new Error('Category not found');
      }

      if (!category.is_default && category.user_id !== userId) {
        throw new Error('Unauthorized category');
      }
    }

    const { data, error } = await (this.client as any).rpc(
      'create_transaction_and_adjust_balance',
      {
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
        p_is_debt: supabaseTransaction.is_debt ?? false,
        p_debt_direction: supabaseTransaction.debt_direction ?? null,
        p_debt_status: supabaseTransaction.debt_status ?? null,
        p_counterparty_name: supabaseTransaction.counterparty_name ?? null,
        p_settled_at: supabaseTransaction.settled_at ?? null,
      }
    );

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    const createdTransaction = mapSupabaseTransactionToDomain(data);
    return createdTransaction;
  }

  private calculateBalanceAdjustment(
    type: string,
    amountMinor: number
  ): number {
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

  async update(
    id: string,
    updates: UpdateTransactionDTO
  ): Promise<Transaction> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    if (updates.accountId) {
      await this.ensureAccountOwned(updates.accountId, userId);
    }

    if (updates.categoryId !== undefined && updates.categoryId !== null) {
      const { data: category, error: categoryError } = await this.client
        .from('categories')
        .select('id, user_id, is_default')
        .eq('id', updates.categoryId)
        .single();

      if (categoryError || !category) {
        throw new Error('Category not found');
      }

      if (!category.is_default && category.user_id !== userId) {
        throw new Error('Unauthorized category');
      }
    }

    // Get the original transaction to calculate balance difference
    const originalTransaction = await this.findById(id);
    if (!originalTransaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    const { id: updateId, ...updateData } = updates;
    const nextIsDebt =
      updateData.isDebt !== undefined
        ? updateData.isDebt
        : originalTransaction.isDebt === true;
    const nextDebtStatus =
      updateData.debtStatus !== undefined
        ? updateData.debtStatus
        : originalTransaction.debtStatus;
    const nextSettledAt =
      updateData.settledAt !== undefined
        ? updateData.settledAt
        : originalTransaction.settledAt;

    if (
      nextIsDebt === true &&
      !updateData.debtDirection &&
      !originalTransaction.debtDirection
    ) {
      throw new Error('debtDirection is required when isDebt=true');
    }

    if (nextDebtStatus === DebtStatus.SETTLED && !nextSettledAt) {
      throw new Error('settledAt is required when debtStatus=SETTLED');
    }

    const supabaseUpdates = mapDomainTransactionToSupabase({
      ...updateData,
      isDebt: nextIsDebt,
      debtStatus: nextIsDebt ? nextDebtStatus || DebtStatus.OPEN : undefined,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await (this.client.from('transactions') as any)
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
      const originalAdjustment = this.calculateBalanceAdjustment(
        originalTransaction.type,
        originalTransaction.amountMinor
      );
      const newAdjustment = this.calculateBalanceAdjustment(
        updatedTransaction.type,
        updatedTransaction.amountMinor
      );
      const balanceDifference = newAdjustment - originalAdjustment;

      if (balanceDifference !== 0 && this.accountsRepository) {
        await this.accountsRepository.adjustBalance(
          updatedTransaction.accountId,
          balanceDifference
        );
        console.log(
          `✅ Balance updated for account ${updatedTransaction.accountId}: ${balanceDifference > 0 ? '+' : ''}${balanceDifference / 100}`
        );
      }
    } catch (balanceError) {
      console.error(
        '❌ Failed to update account balance on transaction update:',
        balanceError
      );
    }

    return updatedTransaction;
  }

  async delete(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const existingTransaction = await this.findById(id);
    if (!existingTransaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    const { error } = await (this.client as any).rpc(
      'delete_transaction_and_adjust_balance',
      {
        transaction_id_input: id,
      }
    );

    if (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return 0;
    }

    const { count, error } = await this.client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('account_id', scope.accountIds);

    if (error) {
      throw new Error(`Failed to count transactions: ${error.message}`);
    }

    return count || 0;
  }

  async getTotalByAccountId(accountId: string): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    await this.ensureAccountOwned(accountId, userId);

    const { data, error } = await this.client
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

  async getTotalByCategoryId(
    categoryId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) return 0;

    let query = this.client
      .from('transactions')
      .select('amount_base_minor')
      .in('account_id', scope.accountIds)
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

    return ((data as any[]) || []).reduce(
      (total, transaction: any) =>
        total + (transaction?.amount_base_minor || 0),
      0
    );
  }

  async getMonthlyTotals(
    year: number
  ): Promise<{ month: number; income: number; expense: number }[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const userId = await this.getUserId();
    if (!userId) return [];

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) return [];

    const { data, error } = await this.client
      .from('transactions')
      .select('date, amount_base_minor, type')
      .in('account_id', scope.accountIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      throw new Error(`Failed to get monthly totals: ${error.message}`);
    }

    // Group by month
    const monthlyData: {
      [month: number]: { income: number; expense: number };
    } = {};

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

  async findByAccountId(
    accountId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const userId = await this.getUserId();
    if (!userId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    await this.ensureAccountOwned(accountId, userId);

    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
    } = pagination || {};
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.client
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId)
      .order(
        sortBy === 'createdAt'
          ? 'created_at'
          : sortBy === 'date'
            ? 'date'
            : 'date',
        { ascending: sortOrder === 'asc' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(
        `Failed to fetch transactions by account: ${error.message}`
      );
    }

    return {
      data: mapSupabaseTransactionArrayToDomain(data || []),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findByCategoryId(
    categoryId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const userId = await this.getUserId();
    if (!userId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
    } = pagination || {};
    const offset = (page - 1) * limit;

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const { data, error, count } = await this.client
      .from('transactions')
      .select('*', { count: 'exact' })
      .in('account_id', scope.accountIds)
      .eq('category_id', categoryId)
      .order(
        sortBy === 'createdAt'
          ? 'created_at'
          : sortBy === 'date'
            ? 'date'
            : 'date',
        { ascending: sortOrder === 'asc' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(
        `Failed to fetch transactions by category: ${error.message}`
      );
    }

    return {
      data: mapSupabaseTransactionArrayToDomain(data || []),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findByType(
    type: TransactionType,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const userId = await this.getUserId();
    if (!userId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
    } = pagination || {};
    const offset = (page - 1) * limit;

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const { data, error, count } = await this.client
      .from('transactions')
      .select('*', { count: 'exact' })
      .in('account_id', scope.accountIds)
      .eq('type', type)
      .order(
        sortBy === 'createdAt'
          ? 'created_at'
          : sortBy === 'date'
            ? 'date'
            : 'date',
        { ascending: sortOrder === 'asc' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions by type: ${error.message}`);
    }

    return {
      data: mapSupabaseTransactionArrayToDomain(data || []),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const userId = await this.getUserId();
    if (!userId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .in('account_id', scope.accountIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch transactions by date range: ${error.message}`
      );
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
    const userId = await this.getUserId();
    if (!userId) return [];

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) return [];

    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('transfer_id', transferId)
      .in('account_id', scope.accountIds);

    if (error) {
      throw new Error(
        `Failed to fetch transactions by transfer ID: ${error.message}`
      );
    }

    return mapSupabaseTransactionArrayToDomain(data || []);
  }

  async search(
    query: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const userId = await this.getUserId();
    if (!userId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .in('account_id', scope.accountIds)
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

  async findDebts(
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      debtDirection?: DebtDirection;
      debtStatus?: DebtStatus;
      accountIds?: string[];
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    return this.findByFilters(
      {
        accountIds: filters?.accountIds,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        debtMode: 'ONLY_DEBT',
        debtDirection: filters?.debtDirection,
        debtStatus: filters?.debtStatus ?? DebtStatus.OPEN,
      },
      pagination
    );
  }

  async getDebtSummary(filters?: {
    dateFrom?: string;
    dateTo?: string;
    accountIds?: string[];
  }): Promise<DebtSummary> {
    const pageSize = 500;
    let page = 1;
    let hasMore = true;
    const allDebts: Transaction[] = [];

    while (hasMore) {
      const debts = await this.findDebts(
        {
          accountIds: filters?.accountIds,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
          debtStatus: DebtStatus.OPEN,
        },
        { page, limit: pageSize, sortBy: 'date', sortOrder: 'desc' }
      );

      allDebts.push(...debts.data);
      hasMore = page < debts.totalPages;
      page += 1;
    }

    const totals = allDebts.reduce(
      (acc, transaction) => {
        if (transaction.debtDirection === DebtDirection.OWE) {
          acc.totalOweBaseMinor += transaction.amountBaseMinor;
        }

        if (transaction.debtDirection === DebtDirection.OWED_TO_ME) {
          acc.totalOwedToMeBaseMinor += transaction.amountBaseMinor;
        }

        return acc;
      },
      {
        totalOweBaseMinor: 0,
        totalOwedToMeBaseMinor: 0,
      }
    );

    return {
      ...totals,
      netDebtBaseMinor:
        totals.totalOwedToMeBaseMinor - totals.totalOweBaseMinor,
      openCount: allDebts.length,
    };
  }

  async getTotalByType(
    type: TransactionType,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) return 0;

    let query = this.client
      .from('transactions')
      .select('amount_base_minor')
      .in('account_id', scope.accountIds)
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

    return ((data as any[]) || []).reduce(
      (total, transaction: any) =>
        total + (transaction?.amount_base_minor || 0),
      0
    );
  }

  async getTotalByCategory(
    categoryId: string,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    return this.getTotalByCategoryId(categoryId, startDate, endDate);
  }

  async getTotalByAccount(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    await this.ensureAccountOwned(accountId, userId);

    let query = this.client
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

  async getMonthlyReports(
    startMonth: string,
    endMonth: string
  ): Promise<any[]> {
    // TODO: Implement proper monthly reports
    return [];
  }

  async getCashFlowData(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<any[]> {
    // TODO: Implement proper cash flow data
    return [];
  }

  async getCategoryBreakdown(
    startDate: string,
    endDate: string,
    type?: TransactionType
  ): Promise<any[]> {
    // TODO: Implement proper category breakdown
    return [];
  }

  async getAccountBreakdown(
    startDate: string,
    endDate: string,
    type?: TransactionType
  ): Promise<any[]> {
    // TODO: Implement proper account breakdown
    return [];
  }

  async createTransfer(
    fromTransaction: CreateTransactionDTO,
    toTransaction: CreateTransactionDTO
  ): Promise<any> {
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
  async findPaginated(
    params: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
    } = params;
    const offset = (page - 1) * limit;

    const userId = await this.getUserId();
    if (!userId) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const scope = await getOwnedAccountScope(this.client, userId);
    if (!hasOwnedAccounts(scope)) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const { count, error: countError } = await this.client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('account_id', scope.accountIds);

    if (countError) {
      throw new Error(`Failed to count transactions: ${countError.message}`);
    }

    const sortColumn =
      sortBy === 'createdAt'
        ? 'created_at'
        : sortBy === 'date'
          ? 'date'
          : sortBy;

    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .in('account_id', scope.accountIds)
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return {
      data: mapSupabaseTransactionArrayToDomain(data || []),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
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
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const accountIds = await this.getUserAccountIds(userId);
    if (accountIds.length === 0) return;

    const { error } = await this.client
      .from('transactions')
      .delete()
      .in('id', ids)
      .in('account_id', accountIds);

    if (error) {
      throw new Error(`Failed to delete transactions: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const transaction = await this.findById(id);
    return transaction !== null;
  }
}
