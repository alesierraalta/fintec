import * as schemas from './schemas';
import {
  formatAccountBalance,
  formatGoalCreated,
  formatTransactionCreated,
  formatQueryResult,
  formatSearchResults,
  type QueryTransactionsRow,
  type HybridSearchRow,
} from './formatters';
import type { AppRepository } from '@/repositories/contracts';
import { TransactionType } from '@/types/domain';
import { embedText } from '../rag/embeddings';
import { rerankCandidates, type RerankCandidate } from '../rag/reranker';
import type { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type inference from schemas
type CreateTransactionArgs = z.infer<typeof schemas.createTransactionSchema>;
type GetAccountBalanceArgs = z.infer<typeof schemas.getAccountBalanceSchema>;
type CreateGoalArgs = z.infer<typeof schemas.createGoalSchema>;
type QueryTransactionsArgs = z.infer<typeof schemas.queryTransactionsSchema>;
type SearchTransactionsArgs = z.infer<
  typeof schemas.searchTransactionsSchema
>;

interface ToolContext {
  userId: string;
  repository: AppRepository;
  /**
   * Raw Supabase client, required by `queryTransactions` and
   * `searchTransactions` to invoke the `query_transactions` and
   * `hybrid_search_transactions` RPCs directly — these are read-only
   * retrieval calls not modeled on the domain `AppRepository` interface.
   */
  supabase?: SupabaseClient;
}

/**
 * Creates a new financial transaction.
 */
export async function createTransaction(
  args: CreateTransactionArgs,
  ctx: ToolContext
): Promise<string> {
  try {
    const accountsRepo = ctx.repository.accounts;
    const categoriesRepo = ctx.repository.categories;
    const transactionsRepo = ctx.repository.transactions;

    // 1. Resolve Account
    const accounts = await accountsRepo.findByUserId(ctx.userId);

    if (accounts.length === 0) {
      throw new Error('No accounts found. Please create an account first.');
    }

    let accountId = accounts.find(
      (a) => a.name.toLowerCase() === args.accountName?.toLowerCase()
    )?.id;

    if (!accountId) {
      // Default to first account
      accountId = accounts[0].id;
      console.log(`[AI] Defaulting to account: ${accounts[0].name}`);
    }

    // 2. Resolve Category
    const categories = await categoriesRepo.findAll();
    const userCategories = categories.filter((c) => c.userId === ctx.userId);

    let categoryId = userCategories.find(
      (c) => c.name.toLowerCase() === args.category?.toLowerCase()
    )?.id;

    if (!categoryId) {
      // Fallback to "General" or first category
      const fallback = userCategories.find(
        (c) => c.name === 'General' || c.name === 'Uncategorized'
      );
      categoryId = fallback?.id || userCategories[0]?.id;

      if (!categoryId) {
        console.log('[AI] Defaulting to first category found for user');
        categoryId = userCategories[0]?.id; // Ensure we have SOME category
        if (!categoryId) {
          // Check if global categories exist
          const allCats = await categoriesRepo.findAll();
          const globalFallback = allCats.find(
            (c) => c.name === 'General' || c.name === 'Uncategorized'
          );
          categoryId = globalFallback?.id;
        }
        if (!categoryId)
          throw new Error(
            'No categories found. Please create a category first.'
          );
      } else {
        console.log(
          `[AI] Defaulting to category: ${userCategories.find((c) => c.id === categoryId)?.name}`
        );
      }
    }

    // 3. Create Transaction
    const account = accounts.find((a) => a.id === accountId);
    const category = userCategories.find((c) => c.id === categoryId);

    const newTransaction = {
      amountMinor: Math.round(args.amount * 100), // Convert to minor units
      description: args.description,
      categoryId,
      accountId,
      date: args.date || new Date().toISOString().split('T')[0],
      type: args.type as TransactionType,
      currencyCode: account?.currencyCode || 'USD',
    };

    const transaction = await transactionsRepo.create(newTransaction);

    return formatTransactionCreated({
      description: args.description,
      amountBaseMinor: newTransaction.amountMinor,
      currencyCode: newTransaction.currencyCode,
      type: args.type,
      categoryName: category?.name || 'Unknown',
      date: args.date || new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('No accounts found')) {
      throw error;
    }
    throw new Error(
      `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Executes the `query_transactions` RPC: closed, parameterized filters
 * (date/amount/category/account) plus an aggregate mode (sum|count|avg|
 * groupBy), enforced under RLS for the calling user.
 */
export async function queryTransactions(
  args: QueryTransactionsArgs,
  ctx: ToolContext
): Promise<string> {
  if (!ctx.supabase) {
    throw new Error('Supabase client not available for queryTransactions');
  }

  try {
    let categoryId: string | null = null;
    if (args.category) {
      const categories = await ctx.repository.categories.findAll();
      const normalized = args.category.trim().toLowerCase();
      const match = categories.find(
        (c) =>
          (c as { userId?: string }).userId === ctx.userId &&
          c.name.trim().toLowerCase() === normalized
      );
      categoryId = match?.id ?? null;
    }

    let accountId: string | null = null;
    if (args.accountName) {
      const accounts = await ctx.repository.accounts.findByUserId(
        ctx.userId
      );
      const normalized = args.accountName.trim().toLowerCase();
      const match = accounts.find(
        (a) => a.name.trim().toLowerCase() === normalized
      );
      accountId = match?.id ?? null;
    }

    const { data, error } = await ctx.supabase.rpc('query_transactions', {
      p_date_from: args.dateFrom ?? null,
      p_date_to: args.dateTo ?? null,
      p_amount_min:
        args.amountMin !== undefined
          ? Math.round(args.amountMin * 100)
          : null,
      p_amount_max:
        args.amountMax !== undefined
          ? Math.round(args.amountMax * 100)
          : null,
      p_category_id: categoryId,
      p_account_id: accountId,
      p_aggregate: args.aggregate,
      p_group_by_field: args.groupByField ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return formatQueryResult(
      (data ?? []) as QueryTransactionsRow[],
      args.aggregate
    );
  } catch (error) {
    throw new Error(
      `Failed to query transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Executes the `hybrid_search_transactions` RPC: embeds the query
 * (RETRIEVAL_QUERY), fuses pgvector cosine similarity + Spanish FTS +
 * pg_trgm via weighted RRF (rrf_k=50), then applies the optional fail-open
 * reranker before formatting the results.
 */
export async function searchTransactions(
  args: SearchTransactionsArgs,
  ctx: ToolContext
): Promise<string> {
  if (!ctx.supabase) {
    throw new Error('Supabase client not available for searchTransactions');
  }

  try {
    const embedding = await embedText(args.query, 'RETRIEVAL_QUERY');

    const { data, error } = await ctx.supabase.rpc(
      'hybrid_search_transactions',
      {
        p_query_embedding: embedding,
        p_query_text: args.query,
        p_match_count: 50,
        p_rrf_k: 50,
        p_w_vec: 1.0,
        p_w_fts: 1.0,
        p_w_trgm: 0.5,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as HybridSearchRow[];
    if (rows.length === 0) {
      return formatSearchResults([], args.limit);
    }

    const candidates: RerankCandidate[] = rows.map((row) => ({
      id: row.id,
      text: row.description ?? '',
      score: row.score,
    }));

    const reranked = await rerankCandidates(args.query, candidates);
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const rankedRows = reranked
      .map((candidate) => rowById.get(candidate.id))
      .filter((row): row is HybridSearchRow => row !== undefined);

    return formatSearchResults(rankedRows, args.limit);
  } catch (error) {
    throw new Error(
      `Failed to search transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Checks account balance(s).
 */
export async function getAccountBalance(
  args: GetAccountBalanceArgs,
  ctx: ToolContext
): Promise<string> {
  try {
    const accountsRepo = ctx.repository.accounts;

    const accounts = await accountsRepo.findByUserId(ctx.userId);

    if (accounts.length === 0) {
      return 'No accounts found for your user.';
    }

    // Filter by account name if provided
    let accountsToShow = accounts;

    if (args.accountName) {
      const account = accounts.find((a) =>
        a.name.toLowerCase().includes(args.accountName!.toLowerCase())
      );

      if (!account) {
        return `❌ Cuenta "${args.accountName}" no encontrada.`;
      }

      accountsToShow = [account];
    }

    return formatAccountBalance(accountsToShow);
  } catch (error) {
    throw new Error(
      `Failed to get account balance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Creates a new financial goal.
 */
export async function createGoal(
  args: CreateGoalArgs,
  ctx: ToolContext
): Promise<string> {
  try {
    const goalsRepo = ctx.repository.goals;

    // Validate deadline is in the future
    const deadline = new Date(args.deadline);
    if (deadline < new Date()) {
      throw new Error('Deadline must be in the future.');
    }

    const goal = await goalsRepo.create({
      name: args.name,
      targetBaseMinor: Math.round(args.targetAmount * 100),
      currentBaseMinor: 0,
      targetDate: args.deadline,
      currencyCode: 'USD', // Default, could be made dynamic
      active: true,
    } as any); // Using any to bypass strict typing for now

    return formatGoalCreated({
      name: args.name,
      targetBaseMinor: Math.round(args.targetAmount * 100),
      targetDate: args.deadline,
    });
  } catch (error) {
    throw new Error(
      `Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Exported resolvers object for use in AI route.
 */
export const toolsResolvers = {
  createTransaction,
  queryTransactions,
  searchTransactions,
  getAccountBalance,
  createGoal,
};
