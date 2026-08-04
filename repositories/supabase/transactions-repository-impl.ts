import type { RequestContext } from '@/lib/cache/request-context';
import { TransactionsRepository } from '@/repositories/contracts';
import { logger } from '@/lib/utils/logger';
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
  SettleDebtDTO,
  MonthlyReport,
  CashFlowData,
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
import { getMemoizedOwnedAccountScope } from './memoized-account-scope';
import {
  TRANSACTION_LIST_PROJECTION,
  TRANSACTION_DETAIL_PROJECTION,
} from './transaction-projections';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  EmbeddingService,
  ProductionEmbeddingService,
} from '@/services/embedding-service';
// NOTE: '@/lib/ai/rag/embeddings' is loaded lazily inside
// embedTransactionBestEffort. A static import drags the whole AI SDK
// (ai -> @ai-sdk/gateway -> eventsource-parser) into every consumer of the
// repository factory at module-load time, which crashes in environments
// without a TransformStream global (e.g. Jest's jsdom project).

export class SupabaseTransactionsRepository implements TransactionsRepository {
  private client: SupabaseClient;
  private readonly requestContext?: RequestContext;
  private readonly embeddingService: EmbeddingService;

  constructor(
    client?: SupabaseClient,
    requestContext?: RequestContext,
    embeddingService?: EmbeddingService
  ) {
    this.client = client || supabase;
    this.requestContext = requestContext;
    this.embeddingService =
      embeddingService || new ProductionEmbeddingService();
  }

  private async getUserId(): Promise<string | null> {
    if (this.requestContext) {
      return this.requestContext.userId;
    }

    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user?.id || null;
  }

  private async getUserAccountIds(userId: string): Promise<string[]> {
    const scope = await this.getAccountScope(userId);
    return scope.accountIds;
  }

  private async getAccountScope(userId: string) {
    if (this.requestContext && this.requestContext.userId === userId) {
      return getMemoizedOwnedAccountScope(this.requestContext, this.client);
    }

    return getOwnedAccountScope(this.client, userId);
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

  /**
   * Best-effort, fire-and-forget embedding generation for a transaction
   * row's `description`/`note` text (design decision: "Write path" —
   * best-effort synchronous embed in repository create/update, try/catch,
   * NEVER throw; the `scripts/backfill-embeddings.ts` script reconciles any
   * row left with a NULL embedding, e.g. after a transient provider error).
   *
   * Deliberately NOT awaited by callers: embedding is a non-critical
   * enhancement to search recall, not a write-path dependency. A failure
   * here must never surface to the caller of `create()`/`update()`.
   */
  private embedTransactionBestEffort(
    id: string,
    description: string,
    note: string | null | undefined
  ): void {
    const text = [description, note].filter(Boolean).join(' ').trim();
    if (!text) {
      return;
    }

    this.embeddingService
      .embedText(text, 'RETRIEVAL_DOCUMENT')
      .then((embedding) =>
        this.client
          .from('transactions')
          .update({ embedding } as any)
          .eq('id', id)
      )
      .catch((error) => {
        logger.warn(
          `[ai-rag] Failed to generate/persist embedding for transaction ${id}: ${
            error instanceof Error ? error.message : error
          }`
        );
      });
  }
  async findAll(limit: number = 1000): Promise<Transaction[]> {
    let userId: string;

    if (this.requestContext) {
      userId = this.requestContext.userId;
    } else {
      // Only allow authenticated users - no fallbacks
      const {
        data: { user },
      } = await this.client.auth.getUser();

      if (!user) {
        // No user authenticated = no transactions visible
        console.warn('No authenticated user - returning empty transactions');
        return [];
      }
      userId = user.id;
    }

    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      return [];
    }

    // * Phase 2 Optimization: Use list projection (reduced fields for payload efficiency)
    const { data, error } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION)
      .in('account_id', scope.accountIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any);
  }

  async findById(id: string): Promise<Transaction | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      return null;
    }

    const { data, error } = await this.client
      .from('transactions')
      .select(TRANSACTION_DETAIL_PROJECTION)
      .eq('id', id)
      .in('account_id', scope.accountIds)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }

    return mapSupabaseTransactionToDomain(data as any);
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

    const scope = await this.getAccountScope(userId);
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

    // * Phase 2 Optimization: Use list projection with exact count for pagination efficiency
    let query = this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION, { count: 'exact' })
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
    } else {
      // In ALL or EXCLUDE_DEBT modes, we always hide the linked deduction expense.
      // The linked expense exists only to adjust the balance and should not pollute lists/totals.
      query = query.or('tags.is.null,not.and(tags.cs.{debt-linked})');
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
      data: mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any),
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

    this.assertPositiveMinorAmount(transactionData.amountMinor);

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

    // Debt with source-account deduction: route through the dedicated RPC
    // that inserts the debt (skip) AND the linked EXPENSE in one transaction.
    if (transactionData.isDebt === true && transactionData.deductFromAccount) {
      if (!transactionData.sourceAccountId) {
        throw new Error(
          'sourceAccountId is required when deductFromAccount=true'
        );
      }
      const { data, error } = await (this.client as any).rpc(
        'create_debt_with_deduction',
        {
          p_account_id: transactionData.accountId,
          p_category_id: transactionData.categoryId ?? null,
          p_type: transactionData.type,
          p_currency_code: transactionData.currencyCode,
          p_amount_minor: transactionData.amountMinor,
          p_amount_base_minor: this.computeAmountBaseMinor(
            transactionData.amountMinor,
            transactionData.currencyCode,
            transactionData.exchangeRate
          ),
          p_exchange_rate:
            transactionData.currencyCode === 'VES'
              ? transactionData.exchangeRate || 1
              : 1,
          p_date: transactionData.date,
          p_description: transactionData.description,
          p_note: transactionData.note ?? null,
          p_tags: transactionData.tags ?? null,
          p_debt_direction: transactionData.debtDirection,
          p_debt_status: transactionData.debtStatus ?? DebtStatus.OPEN,
          p_counterparty_name: transactionData.counterpartyName ?? null,
          p_settled_at: transactionData.settledAt ?? null,
          p_deduct: true,
          p_source_account_id: transactionData.sourceAccountId,
          // Category for the linked EXPENSE: caller may supply a default
          // expense category via `categoryId` when it differs from the debt
          // category. When missing, the RPC falls back to no category.
          p_source_category_id: transactionData.categoryId ?? null,
        }
      );

      if (error) {
        throw new Error(`Failed to create debt: ${error.message}`);
      }

      // The RPC returns a json object; we still want the caller to receive
      // a Transaction domain object representing the debt (not the expense).
      const debtId =
        (data && (Array.isArray(data) ? data[0]?.debt_id : data.debt_id)) ??
        null;

      if (!debtId) {
        throw new Error('Failed to create debt: missing debt_id in response');
      }

      // Deliberate decision (PR3 of ai-rag-hybrid-search): the debt+deduction
      // path is NOT hooked for best-effort embedding here — it inserts two
      // rows (the debt skip + linked expense) atomically via a dedicated RPC
      // whose response shape differs from the standard create() path, and
      // debt/settlement rows are a much lower-value retrieval target than
      // ordinary transactions. These rows rely on
      // `scripts/backfill-embeddings.ts` to pick up their NULL embedding.
      const fetched = await this.findById(debtId);
      if (fetched) {
        return fetched;
      }
      // Fallback: if the lookup misses (cache/RLS edge), surface the
      // missing-row error so the caller can react instead of receiving
      // a half-initialized Transaction. (The create_debt_with_deduction
      // RPC always returns a valid id, so a real miss here is exceptional.)
      throw new Error(`Failed to load debt row after create (id=${debtId})`);
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

    const createdTransaction = mapSupabaseTransactionToDomain(data as any);

    // Best-effort embedding (never blocks/fails the write — see method doc).
    this.embedTransactionBestEffort(
      createdTransaction.id,
      supabaseTransaction.description as string,
      (supabaseTransaction.note as string | null | undefined) ?? null
    );

    return createdTransaction;
  }

  private computeAmountBaseMinor(
    amountMinor: number,
    currencyCode: string,
    exchangeRate?: number
  ): number {
    if (currencyCode !== 'VES') return amountMinor;
    const rate = exchangeRate && exchangeRate > 0 ? exchangeRate : 1;
    return Math.round(amountMinor / rate);
  }

  private assertPositiveMinorAmount(amountMinor: number): void {
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      throw new Error(
        'Transaction amount must be a positive integer in minor units'
      );
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

    if (updates.amountMinor !== undefined) {
      this.assertPositiveMinorAmount(updates.amountMinor);
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

    const updateData = updates;
    const accountId = updateData.accountId ?? originalTransaction.accountId;
    const currencyCode =
      updateData.currencyCode ?? originalTransaction.currencyCode;
    const amountMinor =
      updateData.amountMinor ?? originalTransaction.amountMinor;
    const exchangeRate =
      currencyCode === 'VES'
        ? (updateData.exchangeRate ?? originalTransaction.exchangeRate ?? 1)
        : 1;
    const amountBaseMinor =
      currencyCode === 'VES'
        ? Math.round(amountMinor / (exchangeRate > 0 ? exchangeRate : 1))
        : amountMinor;
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

    let updatedTransaction: Transaction;

    if (nextIsDebt === true) {
      const { data, error } = await (this.client as any).rpc(
        'update_debt_with_deduction',
        {
          p_transaction_id: id,
          p_account_id: accountId,
          p_category_id:
            updateData.categoryId !== undefined
              ? updateData.categoryId
              : (originalTransaction.categoryId ?? null),
          p_type: updateData.type ?? originalTransaction.type,
          p_currency_code: currencyCode,
          p_amount_minor: amountMinor,
          p_amount_base_minor: amountBaseMinor,
          p_exchange_rate: exchangeRate,
          p_date: updateData.date ?? originalTransaction.date,
          p_description:
            updateData.description ?? originalTransaction.description ?? null,
          p_note: updateData.note ?? originalTransaction.note ?? null,
          p_tags: updateData.tags ?? originalTransaction.tags ?? null,
          p_debt_direction:
            updateData.debtDirection ?? originalTransaction.debtDirection,
          p_debt_status: nextDebtStatus || DebtStatus.OPEN,
          p_counterparty_name:
            updateData.counterpartyName ??
            originalTransaction.counterpartyName ??
            null,
          p_settled_at: nextSettledAt ?? null,
          p_deduct: updateData.deductFromAccount ?? null,
          p_source_account_id: updateData.sourceAccountId ?? null,
          p_source_category_id:
            updateData.categoryId !== undefined
              ? updateData.categoryId
              : (originalTransaction.categoryId ?? null),
        }
      );

      if (error) {
        throw new Error(`Failed to update debt: ${error.message}`);
      }

      const debtId =
        (data && (Array.isArray(data) ? data[0]?.debt_id : data.debt_id)) ??
        null;

      if (!debtId) {
        throw new Error('Failed to update debt: missing debt_id in response');
      }

      const fetched = await this.findById(debtId);
      if (!fetched) {
        throw new Error(`Failed to load debt row after update (id=${debtId})`);
      }
      updatedTransaction = fetched;
    } else {
      const { data, error } = await (this.client as any).rpc(
        'update_transaction_and_adjust_balance',
        {
          p_transaction_id: id,
          p_account_id: accountId,
          p_category_id:
            updateData.categoryId !== undefined
              ? updateData.categoryId
              : (originalTransaction.categoryId ?? null),
          p_type: updateData.type ?? originalTransaction.type,
          p_currency_code: currencyCode,
          p_amount_minor: amountMinor,
          p_amount_base_minor: amountBaseMinor,
          p_exchange_rate: exchangeRate,
          p_date: updateData.date ?? originalTransaction.date,
          p_description:
            updateData.description ?? originalTransaction.description ?? null,
          p_note: updateData.note ?? originalTransaction.note ?? null,
          p_tags: updateData.tags ?? originalTransaction.tags ?? null,
          p_is_debt: nextIsDebt,
          p_debt_direction: null,
          p_debt_status: null,
          p_counterparty_name: null,
          p_settled_at: null,
        }
      );

      if (error) {
        throw new Error(`Failed to update transaction: ${error.message}`);
      }

      updatedTransaction = mapSupabaseTransactionToDomain(data as any);
    }

    // Best-effort embedding (never blocks/fails the write — see method doc).
    this.embedTransactionBestEffort(
      updatedTransaction.id,
      updatedTransaction.description ?? '',
      updatedTransaction.note ?? null
    );

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
        transaction_id: id,
      }
    );

    if (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    const scope = await this.getAccountScope(userId);
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

    const scope = await this.getAccountScope(userId);
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

    const scope = await this.getAccountScope(userId);
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

    // * Phase 2 Optimization: Use list projection for account transaction queries
    const { data, error, count } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION, { count: 'exact' })
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
      data: mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any),
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

    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // * Phase 2 Optimization: Use list projection for category transaction queries
    const { data, error, count } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION, { count: 'exact' })
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
      data: mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any),
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

    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // * Phase 2 Optimization: Use list projection for transaction type queries
    const { data, error, count } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION, { count: 'exact' })
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
      data: mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any),
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

    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    if (pagination) {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.client
        .from('transactions')
        .select(TRANSACTION_LIST_PROJECTION, { count: 'exact' })
        .in('account_id', scope.accountIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(
          `Failed to fetch transactions by date range: ${error.message}`
        );
      }

      const total = count || 0;
      return {
        data: mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const { data, error } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION)
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

    const transactions = mapSupabaseTransactionArrayToDomain(
      (data || ([] as any)) as any
    );
    return {
      data: transactions,
      total: transactions.length,
      page: 1,
      limit: transactions.length,
      totalPages: 1,
    };
  }

  async findByTransferId(transferId: string): Promise<Transaction[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) return [];

    // * Phase 2 Optimization: Use list projection for transfer ID queries
    const { data, error } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION)
      .eq('transfer_id', transferId)
      .in('account_id', scope.accountIds);

    if (error) {
      throw new Error(
        `Failed to fetch transactions by transfer ID: ${error.message}`
      );
    }

    return mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any);
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

    const scope = await this.getAccountScope(userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: pagination?.limit || 10,
        totalPages: 0,
      };
    }

    if (pagination) {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;

      const { data, error, count } = await this.client
        .from('transactions')
        .select(TRANSACTION_LIST_PROJECTION, { count: 'exact' })
        .in('account_id', scope.accountIds)
        .or(`description.ilike.%${query}%,note.ilike.%${query}%`)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to search transactions: ${error.message}`);
      }

      const total = count || 0;
      return {
        data: mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const { data, error } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION)
      .in('account_id', scope.accountIds)
      .or(`description.ilike.%${query}%,note.ilike.%${query}%`)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to search transactions: ${error.message}`);
    }

    const transactions = mapSupabaseTransactionArrayToDomain(
      (data || ([] as any)) as any
    );
    return {
      data: transactions,
      total: transactions.length,
      page: 1,
      limit: transactions.length,
      totalPages: 1,
    };
  }

  /**
   * Settle a debt (fully or partially) via the atomic `settle_debt_partial`
   * RPC, which inserts the settlement transaction, adjusts the account
   * balance, advances the debt's paid/remaining progress and records the
   * settlement row in a single database transaction. Mirrors the local
   * LocalTransactionsRepository.settleDebt behavior.
   */
  async settleDebt(dto: SettleDebtDTO): Promise<Transaction> {
    const { data, error } = await (this.client as any).rpc(
      'settle_debt_partial',
      {
        p_debt_id: dto.debtTransactionId,
        p_account_id: dto.settlementAccountId,
        p_category_id: dto.categoryId ?? null,
        p_amount_minor: dto.amountMinor,
        p_date: dto.date,
        p_note: dto.note ?? null,
      }
    );

    if (error) {
      throw new Error(`Failed to settle debt: ${error.message}`);
    }

    return mapSupabaseTransactionToDomain(data as any);
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
        debtStatus: filters?.debtStatus,
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
          acc.totalOweBaseMinor +=
            transaction.remainingAmountBaseMinor ?? transaction.amountBaseMinor;
        }

        if (transaction.debtDirection === DebtDirection.OWED_TO_ME) {
          acc.totalOwedToMeBaseMinor +=
            transaction.remainingAmountBaseMinor ?? transaction.amountBaseMinor;
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

    const scope = await this.getAccountScope(userId);
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

  // Analytical methods — not yet implemented for Supabase.
  // Throw explicit errors so callers never receive silently-wrong data.

  async getMonthlyReport(
    _year: number,
    _month: number
  ): Promise<MonthlyReport> {
    throw new Error(
      'getMonthlyReport: not implemented for Supabase repository'
    );
  }

  async getMonthlyReports(
    _startMonth: string,
    _endMonth: string
  ): Promise<MonthlyReport[]> {
    throw new Error(
      'getMonthlyReports: not implemented for Supabase repository'
    );
  }

  async getCashFlowData(
    _startDate: string,
    _endDate: string,
    _groupBy: 'day' | 'week' | 'month'
  ): Promise<CashFlowData[]> {
    throw new Error('getCashFlowData: not implemented for Supabase repository');
  }

  async getCategoryBreakdown(
    _startDate: string,
    _endDate: string,
    _type?: TransactionType
  ): Promise<
    {
      categoryId: string;
      categoryName: string;
      totalBaseMinor: number;
      transactionCount: number;
      percentage: number;
    }[]
  > {
    throw new Error(
      'getCategoryBreakdown: not implemented for Supabase repository'
    );
  }

  async getAccountBreakdown(
    _startDate: string,
    _endDate: string,
    _type?: TransactionType
  ): Promise<
    {
      accountId: string;
      accountName: string;
      totalBaseMinor: number;
      transactionCount: number;
    }[]
  > {
    throw new Error(
      'getAccountBreakdown: not implemented for Supabase repository'
    );
  }

  async createTransfer(
    fromTransaction: CreateTransactionDTO,
    toTransaction: CreateTransactionDTO
  ): Promise<{
    fromTransaction: Transaction;
    toTransaction: Transaction;
    transferId: string;
  }> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // R3-001: reject non-positive / non-integer source amount and
    // non-positive / non-finite exchange rates before the RPC.
    this.assertPositiveMinorAmount(fromTransaction.amountMinor);
    this.assertPositiveMinorAmount(toTransaction.amountMinor);

    const exchangeRate = fromTransaction.exchangeRate ?? 1;
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error('exchangeRate must be a positive finite number');
    }

    // Fetch both accounts' currencies to derive decimal places for
    // the R3-002 destination-amount validation.
    const { data: accounts, error: accountsErr } = await this.client
      .from('accounts')
      .select('id, currency_code')
      .in('id', [fromTransaction.accountId, toTransaction.accountId])
      .eq('user_id', userId);

    if (accountsErr || !accounts || accounts.length !== 2) {
      throw new Error('One or both accounts not found');
    }

    const accountBy = new Map(accounts.map((a) => [a.id, a.currency_code]));

    const srcCurrency = accountBy.get(fromTransaction.accountId)!;
    const destCurrency = accountBy.get(toTransaction.accountId)!;

    const zeroDecimalSet = new Set(['JPY', 'CLP', 'COP']);
    const srcDecimals = zeroDecimalSet.has(srcCurrency) ? 0 : 2;
    const destDecimals = zeroDecimalSet.has(destCurrency) ? 0 : 2;

    const amountMajor = fromTransaction.amountMinor / Math.pow(10, srcDecimals);

    // R3-002: validate that the destination DTO amount matches what
    // the create_transfer RPC will deterministically compute.
    // The RPC does:
    //   v_to_amount_minor := (amount_major * exchange_rate * 10^dest_decimals)::BIGINT
    // We tolerate a <1 minor-unit floating-point difference between JS and PG.
    const expectedDestMinor =
      amountMajor * exchangeRate * Math.pow(10, destDecimals);

    if (
      Math.abs(Math.round(expectedDestMinor) - toTransaction.amountMinor) >= 1
    ) {
      throw new Error(
        `Destination amount mismatch: DTO specifies ${toTransaction.amountMinor} minor units but ` +
          `the RPC would derive ~${Math.round(expectedDestMinor)} minor units ` +
          `(source ${fromTransaction.amountMinor} minor ` +
          `${srcCurrency} × ${exchangeRate} → ${destCurrency})`
      );
    }

    // The canonical create_transfer RPC (migration 20260528010000) is an
    // atomic, SECURITY DEFINER function that validates both accounts, locks
    // them FOR UPDATE, inserts both TRANSFER_OUT + TRANSFER_IN rows with
    // transfer_id set, and adjusts both balances in a single DB transaction.
    const { data: rpcResult, error: rpcErr } = await (this.client as any).rpc(
      'create_transfer',
      {
        p_user_id: userId,
        p_from_account_id: fromTransaction.accountId,
        p_to_account_id: toTransaction.accountId,
        p_amount_major: amountMajor,
        p_description:
          fromTransaction.description ??
          toTransaction.description ??
          'Transferencia',
        p_date: fromTransaction.date,
        p_exchange_rate: exchangeRate,
        p_rate_source: null,
        p_note: fromTransaction.note ?? toTransaction.note ?? null,
      }
    );

    if (rpcErr) {
      throw new Error(`Transfer failed: ${rpcErr.message}`);
    }

    const [from, to] = await Promise.all([
      this.findById(rpcResult.fromTransactionId),
      this.findById(rpcResult.toTransactionId),
    ]);

    if (!from || !to) {
      throw new Error(
        'Transfer succeeded but transaction rows could not be fetched'
      );
    }

    return {
      fromTransaction: from,
      toTransaction: to,
      transferId: rpcResult.transferId,
    };
  }

  async exportToCSV(_filters?: TransactionFilters): Promise<string> {
    throw new Error('exportToCSV: not implemented for Supabase repository');
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

    const scope = await this.getAccountScope(userId);
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

    // * Phase 2 Optimization: Use list projection for paginated queries
    const { data, error } = await this.client
      .from('transactions')
      .select(TRANSACTION_LIST_PROJECTION)
      .in('account_id', scope.accountIds)
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return {
      data: mapSupabaseTransactionArrayToDomain((data || ([] as any)) as any),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async createMany(data: CreateTransactionDTO[]): Promise<Transaction[]> {
    // N sequential RPC calls — no atomic batch RPC exists for transactions in
    // the current schema. Each call to create() is individually atomic (the
    // create_transaction_and_adjust_balance RPC wraps insert+balance-update
    // in a single DB statement). This matches the pattern used by every other
    // Supabase repository (accounts, budgets, categories, goals, exchange-rates).
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
