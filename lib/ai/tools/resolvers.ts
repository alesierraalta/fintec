import * as schemas from './schemas';
import {
  formatGoalCreated,
  formatQueryResult,
  formatSearchResults,
  type QueryTransactionsRow,
  type HybridSearchRow,
} from './formatters';
import type { AppRepository } from '@/repositories/contracts';
import { TransactionType } from '@/types/domain';
import type { Account, Transaction } from '@/types/domain';
import { embedText } from '../rag/embeddings';
import {
  normalizeName,
  resolveAccount,
  resolveCategory,
  type Resolution,
} from '../resolution/entity-resolver';
import { rerankCandidates, type RerankCandidate } from '../rag/reranker';
import { toMinorUnits, toBaseMinor } from '@/lib/money';
import type { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountBalanceResult } from './schemas';

// Type inference from schemas
type CreateTransactionArgs = z.infer<typeof schemas.createTransactionSchema>;
type GetAccountBalanceArgs = z.infer<typeof schemas.getAccountBalanceSchema>;
type CreateGoalArgs = z.infer<typeof schemas.createGoalSchema>;
type QueryTransactionsArgs = z.infer<typeof schemas.queryTransactionsSchema>;
type SearchTransactionsArgs = z.infer<typeof schemas.searchTransactionsSchema>;
type CreateTransferArgs = z.infer<typeof schemas.createTransferSchema>;
type ReclassifyExpenseAsTransferArgs = z.infer<
  typeof schemas.reclassifyExpenseAsTransferSchema
>;

interface ToolContext {
  userId: string;
  repository: AppRepository;
  /** Accounts preloaded by the caller; `getAccountBalance` MUST NOT re-query when present. */
  accounts?: Account[];
  /**
   * Raw Supabase client, required by `queryTransactions` and
   * `searchTransactions` to invoke the `query_transactions` and
   * `hybrid_search_transactions` RPCs directly — these are read-only
   * retrieval calls not modeled on the domain `AppRepository` interface.
   */
  supabase?: SupabaseClient;
  /**
   * The user's base currency (profile `base_currency`, default 'USD' — see
   * contexts/auth-context.tsx:93,117-122). Used for base-currency-relative
   * amounts: `queryTransactions`'s filter bounds (compared against
   * `amount_base_minor`) and `createGoal`'s target amount. NOT used for
   * `createTransaction`, which converts against the account's own currency.
   */
  baseCurrencyCode?: string;
}

/**
 * Creates a new financial transaction.
 */
export async function createTransaction(
  args: CreateTransactionArgs,
  ctx: ToolContext
): Promise<schemas.CreateTransactionResult> {
  try {
    const accountsRepo = ctx.repository.accounts;
    const categoriesRepo = ctx.repository.categories;
    const transactionsRepo = ctx.repository.transactions;

    // 1. Resolve Account
    const accounts = await accountsRepo.findByUserId(ctx.userId);

    if (accounts.length === 0) {
      return {
        status: 'error',
        message: 'No accounts found. Please create an account first.',
      };
    }

    const accountResolution = resolveAccount({
      accounts,
      accountName: args.accountName,
    });
    if (accountResolution.status !== 'resolved') return accountResolution;
    const account = accountResolution.value;
    const accountId = account.id;

    // 2. Resolve Category among defaults and user categories of the same kind
    const categoryResolution = resolveCategory({
      categories: await categoriesRepo.findAll(),
      userId: ctx.userId,
      kind: args.type,
      categoryId: args.categoryId,
      categoryName: args.category,
      description: args.description,
    });
    if (categoryResolution.status !== 'resolved') return categoryResolution;
    const category = categoryResolution.value;
    const categoryId = category.id;

    // 3. Create Transaction
    const currencyCode = account.currencyCode || 'USD';
    const newTransaction = {
      amountMinor: toMinorUnits(args.amount, currencyCode),
      description: args.description,
      categoryId,
      accountId,
      date: args.date || new Date().toISOString().split('T')[0],
      type: args.type as TransactionType,
      currencyCode,
    };

    const transaction = await transactionsRepo.create(newTransaction);

    return {
      status: 'success',
      transaction: {
        id: transaction.id,
        description: args.description,
        amountMinor: newTransaction.amountMinor,
        currencyCode: newTransaction.currencyCode,
        type: args.type,
        categoryName: category.name,
        accountName: account.name,
        date: newTransaction.date,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

type AccountPair =
  | { status: 'resolved'; from: Account; to: Account }
  | Exclude<Resolution<Account>, { status: 'resolved' }>;

async function resolveOwnAccountPair(
  ctx: ToolContext,
  fromAccountName: string,
  toAccountName: string
): Promise<AccountPair> {
  const accounts = await ctx.repository.accounts.findByUserId(ctx.userId);
  const from = resolveAccount({ accounts, accountName: fromAccountName });
  if (from.status !== 'resolved') return from;
  const to = resolveAccount({ accounts, accountName: toAccountName });
  if (to.status !== 'resolved') return to;
  if (from.value.id === to.value.id) {
    return {
      status: 'needs_clarification',
      field: 'account',
      message: `El origen y el destino son la misma cuenta (${from.value.name}). ¿A cuál cuenta va el dinero?`,
      options: accounts
        .filter((a) => a.id !== from.value.id)
        .map((a) => a.name),
    };
  }
  return { status: 'resolved', from: from.value, to: to.value };
}

function missingRate(from: Account, to: Account) {
  return {
    status: 'needs_clarification' as const,
    field: 'exchangeRate' as const,
    message: `${from.name} está en ${from.currencyCode} y ${to.name} en ${to.currencyCode}. ¿A qué tasa se hizo el cambio (o cuánto llegó a ${to.name})?`,
    options: [],
  };
}

/**
 * Moves money between two of the user's own accounts through the atomic
 * `create_transfer` RPC. Never records an expense (#114).
 */
export async function createTransfer(
  args: CreateTransferArgs,
  ctx: ToolContext
): Promise<schemas.CreateTransferResult> {
  try {
    const pair = await resolveOwnAccountPair(
      ctx,
      args.fromAccountName,
      args.toAccountName
    );
    if (pair.status !== 'resolved') return pair;
    const { from, to } = pair;
    if (from.currencyCode !== to.currencyCode && !args.exchangeRate) {
      return missingRate(from, to);
    }

    const result = await ctx.repository.transfers.create(ctx.userId, {
      fromAccountId: from.id,
      toAccountId: to.id,
      amountMajor: args.amount,
      description:
        args.description ?? `Transferencia de ${from.name} a ${to.name}`,
      date: args.date,
      exchangeRate: args.exchangeRate,
    });

    return {
      status: 'success',
      transfer: {
        id: result.transferId,
        fromAccountName: from.name,
        toAccountName: to.name,
        fromAmountMinor: result.fromAmount,
        toAmountMinor: result.toAmount,
        fromCurrency: result.fromCurrency,
        toCurrency: result.toCurrency,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to create transfer: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

const EXPENSE_PAGE_SIZE = 200;
const MAX_EXPENSE_PAGES = 50;

/** Every expense of the account (optionally on one date), across all pages. */
async function findAllExpenses(
  ctx: ToolContext,
  accountId: string,
  date?: string
): Promise<Transaction[]> {
  const rows: Transaction[] = [];
  for (let page = 1; page <= MAX_EXPENSE_PAGES; page++) {
    const result = await ctx.repository.transactions.findByFilters(
      {
        accountIds: [accountId],
        types: [TransactionType.EXPENSE],
        ...(date ? { dateFrom: date, dateTo: date } : {}),
      },
      { page, limit: EXPENSE_PAGE_SIZE, sortBy: 'date', sortOrder: 'desc' }
    );
    rows.push(...result.data);
    if (page >= result.totalPages || result.data.length < EXPENSE_PAGE_SIZE) {
      break;
    }
  }
  return rows;
}

/** Debt deductions carry debt-linked / debt:<id> tags and must stay expenses. */
function isDebtLinked(transaction: Transaction): boolean {
  return (transaction.tags ?? []).some(
    (tag) => tag === 'debt-linked' || tag.startsWith('debt:')
  );
}

/**
 * Repairs an own-account transfer that was recorded as an expense: finds the
 * expense on the source account by amount (and date when given) and converts
 * it atomically into a transfer (`convert_expense_to_transfer` RPC).
 */
export async function reclassifyExpenseAsTransfer(
  args: ReclassifyExpenseAsTransferArgs,
  ctx: ToolContext
): Promise<schemas.ReclassifyExpenseAsTransferResult> {
  try {
    const pair = await resolveOwnAccountPair(
      ctx,
      args.fromAccountName,
      args.toAccountName
    );
    if (pair.status !== 'resolved') return pair;
    const { from, to } = pair;
    if (from.currencyCode !== to.currencyCode && !args.exchangeRate) {
      return missingRate(from, to);
    }

    const amountMinor = toMinorUnits(args.amount, from.currencyCode);
    const candidates = (
      await findAllExpenses(ctx, from.id, args.date)
    ).filter(
      (t) =>
        t.amountMinor === amountMinor &&
        !t.transferId &&
        !t.isDebt &&
        !isDebtLinked(t)
    );
    let target: Transaction | undefined;
    if (args.transactionId) {
      target = candidates.find((t) => t.id === args.transactionId);
    } else if (candidates.length === 1) {
      target = candidates[0];
    }

    if (!target) {
      return {
        status: 'needs_clarification',
        field: 'transaction',
        message:
          candidates.length === 0
            ? `No encontré un gasto de ${args.amount} ${from.currencyCode} en ${from.name}${args.date ? ` el ${args.date}` : ''}. ¿De qué fecha o monto exacto era?`
            : `Encontré ${candidates.length} gastos de ${args.amount} ${from.currencyCode} en ${from.name}. ¿Cuál convierto en transferencia?`,
        options: candidates.map(
          (t) =>
            `${t.date} · ${t.description ?? 'Sin descripción'} [id: ${t.id}]`
        ),
      };
    }

    const result = await ctx.repository.transfers.convertExpenseToTransfer(
      target.id,
      to.id,
      args.exchangeRate
    );

    return {
      status: 'success',
      converted: {
        transactionId: target.id,
        transferId: result.transferId,
        description: target.description,
        date: target.date,
        amountMinor: target.amountMinor,
        currencyCode: from.currencyCode,
        fromAccountName: from.name,
        toAccountName: to.name,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to convert expense: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
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
      const normalized = normalizeName(args.category);
      const match = categories.find(
        (c) =>
          (c.userId === null || c.userId === ctx.userId) &&
          normalizeName(c.name) === normalized
      );
      categoryId = match?.id ?? null;
    }

    let accountId: string | null = null;
    if (args.accountName) {
      const accounts = await ctx.repository.accounts.findByUserId(ctx.userId);
      const normalized = args.accountName.trim().toLowerCase();
      const match = accounts.find(
        (a) => a.name.trim().toLowerCase() === normalized
      );
      accountId = match?.id ?? null;
    }

    // When type is specified (e.g. INCOME or EXPENSE), ensure accurate typed querying
    // (since query_transactions RPC lacks p_type).
    if (args.type) {
      if (
        (!args.aggregate || args.aggregate === 'sum') &&
        !args.groupByField &&
        !categoryId &&
        !accountId &&
        args.amountMin === undefined &&
        args.amountMax === undefined
      ) {
        const totalMinor = await ctx.repository.transactions.getTotalByType(
          args.type as TransactionType,
          args.dateFrom,
          args.dateTo
        );

        return formatQueryResult(
          [
            {
              group_key: null,
              result_value: totalMinor,
              row_count: totalMinor > 0 ? 1 : 0,
            },
          ],
          'sum'
        );
      }

      const groupBy = args.groupByField;
      const baseCurrencyCode = ctx.baseCurrencyCode ?? 'USD';
      const amountMinMinor =
        args.amountMin !== undefined
          ? toBaseMinor(args.amountMin, { baseCurrencyCode })
          : undefined;
      const amountMaxMinor =
        args.amountMax !== undefined
          ? toBaseMinor(args.amountMax, { baseCurrencyCode })
          : undefined;

      const { data: txList } = await ctx.repository.transactions.findByFilters(
        {
          types: [args.type as TransactionType],
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          categoryIds: categoryId ? [categoryId] : undefined,
          accountIds: accountId ? [accountId] : undefined,
          amountMin: amountMinMinor,
          amountMax: amountMaxMinor,
        },
        { page: 1, limit: 1000 }
      );

      if (groupBy || args.aggregate === 'groupBy') {
        const field = groupBy || 'category';
        const groups = new Map<string, { total: number; count: number }>();
        const categories = await ctx.repository.categories.findAll();
        const catMap = new Map(categories.map((c) => [c.id, c.name]));
        const accounts = await ctx.repository.accounts.findByUserId(ctx.userId);
        const accMap = new Map(accounts.map((a) => [a.id, a.name]));

        for (const tx of txList) {
          let key: string;
          if (field === 'category') {
            key =
              (tx.categoryId ? catMap.get(tx.categoryId) : undefined) ??
              (tx as any).categoryName ??
              'Sin categoría';
          } else {
            key =
              (tx.accountId ? accMap.get(tx.accountId) : undefined) ??
              (tx as any).accountName ??
              'Sin cuenta';
          }

          const current = groups.get(key) || { total: 0, count: 0 };
          current.total += tx.amountBaseMinor ?? tx.amountMinor ?? 0;
          current.count += 1;
          groups.set(key, current);
        }

        const rows: QueryTransactionsRow[] = Array.from(groups.entries()).map(
          ([group_key, val]) => ({
            group_key,
            result_value: val.total,
            row_count: val.count,
          })
        );

        return formatQueryResult(rows, 'groupBy');
      }

      const count = txList.length;
      const sum = txList.reduce(
        (acc, tx) => acc + (tx.amountBaseMinor ?? tx.amountMinor ?? 0),
        0
      );
      const val =
        args.aggregate === 'count'
          ? count
          : args.aggregate === 'avg'
            ? count > 0
              ? Math.round(sum / count)
              : 0
            : sum;

      return formatQueryResult(
        [
          {
            group_key: null,
            result_value: val,
            row_count: count,
          },
        ],
        args.aggregate || 'sum'
      );
    }

    const baseCurrencyCode = ctx.baseCurrencyCode ?? 'USD';
    const { data, error } = await ctx.supabase.rpc('query_transactions', {
      p_date_from: args.dateFrom ?? null,
      p_date_to: args.dateTo ?? null,
      p_amount_min:
        args.amountMin !== undefined
          ? toBaseMinor(args.amountMin, { baseCurrencyCode })
          : null,
      p_amount_max:
        args.amountMax !== undefined
          ? toBaseMinor(args.amountMax, { baseCurrencyCode })
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
 * Checks account balance(s); uses injected accounts or the repository fallback.
 */
export async function getAccountBalance(
  args: GetAccountBalanceArgs,
  ctx: ToolContext
): Promise<AccountBalanceResult> {
  try {
    const accounts =
      ctx.accounts ?? (await ctx.repository.accounts.findByUserId(ctx.userId));

    if (accounts.length === 0) {
      return { status: 'empty', message: 'No accounts found for your user.' };
    }

    // Filter by account name if provided
    let accountsToShow = accounts;

    if (args.accountName) {
      const account = accounts.find((a) =>
        a.name.toLowerCase().includes(args.accountName!.toLowerCase())
      );

      if (!account) {
        return {
          status: 'empty',
          message: `❌ Cuenta "${args.accountName}" no encontrada.`,
        };
      }

      accountsToShow = [account];
    }

    // USD-only subtotal; omitted when no USD account matches (no invented zero).
    const usdAccounts = accountsToShow.filter((a) => a.currencyCode === 'USD');
    const usdSubtotalMinor = usdAccounts.reduce((s, a) => s + a.balance, 0);

    return {
      status: 'success',
      accounts: accountsToShow.map((account) => ({
        name: account.name,
        balanceMinor: account.balance,
        currencyCode: account.currencyCode,
      })),
      ...(usdAccounts.length > 0 ? { usdSubtotalMinor } : {}),
    };
  } catch (error) {
    // Safe failure state: never leak internal exception details to the model.
    return {
      status: 'error',
      message: 'Unable to check account balances right now. Please try again.',
    };
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

    const baseCurrencyCode = ctx.baseCurrencyCode ?? 'USD';
    const targetBaseMinor = toBaseMinor(args.targetAmount, {
      baseCurrencyCode,
    });

    await goalsRepo.create({
      name: args.name,
      targetBaseMinor,
      currentBaseMinor: 0,
      targetDate: args.deadline,
      currencyCode: baseCurrencyCode,
      active: true,
    } as any); // Using any to bypass strict typing for now

    return formatGoalCreated({
      name: args.name,
      targetBaseMinor,
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
  createTransfer,
  reclassifyExpenseAsTransfer,
  queryTransactions,
  searchTransactions,
  getAccountBalance,
  createGoal,
};
