import { z } from 'zod';

/**
 * Schema for creating a financial transaction via AI.
 *
 * @example
 * { amount: 50, description: "Coffee", category: "Food", type: "EXPENSE" }
 */
export const createTransactionSchema = z.object({
  amount: z
    .number()
    .positive()
    .describe('Amount in major currency units (e.g., 50.00 for $50)'),
  description: z.string().min(1).describe('Transaction description'),
  category: z
    .string()
    .describe(
      'Category name, copied from the user categories listed in the system prompt for this type'
    ),
  categoryId: z
    .string()
    .optional()
    .describe(
      'Id of the chosen category from the system prompt list. Must belong to the same type (INCOME or EXPENSE).'
    ),
  accountName: z
    .string()
    .optional()
    .describe('Account name. If omitted, uses default account.'),
  type: z
    .enum(['INCOME', 'EXPENSE'])
    .default('EXPENSE')
    .describe('Type of transaction'),
  date: z
    .string()
    .optional()
    .describe(
      'ISO date string (YYYY-MM-DD). Defaults to today if not specified.'
    ),
});

/**
 * Shared result when a tool needs the user to choose before writing
 * anything (unknown category/account, missing rate, ambiguous expense).
 */
export const clarificationResultSchema = z.object({
  status: z.literal('needs_clarification'),
  field: z.enum(['category', 'account', 'exchangeRate', 'transaction']),
  message: z.string(),
  options: z.array(z.string()),
});

/**
 * Structured `createTransaction` result for validated UI card rendering.
 */
export const createTransactionResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    transaction: z.object({
      id: z.string().optional(),
      description: z.string(),
      amountMinor: z.number().int(),
      currencyCode: z.string(),
      type: z.enum(['INCOME', 'EXPENSE']),
      categoryName: z.string().optional(),
      accountName: z.string().optional(),
      date: z.string(),
    }),
  }),
  clarificationResultSchema,
  z.object({ status: z.literal('error'), message: z.string() }),
]);

export type CreateTransactionResult = z.infer<
  typeof createTransactionResultSchema
>;

/**
 * Schema for moving money between two of the user's OWN accounts (#114).
 * Paying a third party is an expense, not a transfer.
 *
 * @example
 * { fromAccountName: "Zelle", toAccountName: "Binance", amount: 7000 }
 */
export const createTransferSchema = z.object({
  fromAccountName: z.string().min(1).describe('Own account the money leaves'),
  toAccountName: z.string().min(1).describe('Own account the money enters'),
  amount: z
    .number()
    .positive()
    .describe('Amount in major units of the SOURCE account currency'),
  exchangeRate: z
    .number()
    .positive()
    .optional()
    .describe(
      'Destination units per source unit. Required only when the two accounts have different currencies.'
    ),
  description: z.string().optional().describe('Optional transfer description'),
  date: z
    .string()
    .optional()
    .describe('ISO date (YYYY-MM-DD). Defaults to today.'),
});

export const createTransferResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    transfer: z.object({
      id: z.string(),
      fromAccountName: z.string(),
      toAccountName: z.string(),
      fromAmountMinor: z.number().int().optional(),
      toAmountMinor: z.number().int().optional(),
      fromCurrency: z.string().optional(),
      toCurrency: z.string().optional(),
    }),
  }),
  clarificationResultSchema,
  z.object({ status: z.literal('error'), message: z.string() }),
]);

export type CreateTransferResult = z.infer<typeof createTransferResultSchema>;

/**
 * Schema for repairing an own-account transfer that was recorded as an
 * expense: the expense on `fromAccountName` becomes a transfer to
 * `toAccountName` and both balances are corrected atomically.
 */
export const reclassifyExpenseAsTransferSchema = z.object({
  fromAccountName: z
    .string()
    .min(1)
    .describe('Account where the expense was recorded'),
  toAccountName: z
    .string()
    .min(1)
    .describe('Own account that should have received the money'),
  amount: z
    .number()
    .positive()
    .describe('Amount of the mis-recorded expense in major units'),
  date: z
    .string()
    .optional()
    .describe('Date of the expense (YYYY-MM-DD) if known'),
  transactionId: z
    .string()
    .optional()
    .describe('Exact expense id, only when a previous clarification listed it'),
  exchangeRate: z
    .number()
    .positive()
    .optional()
    .describe('Required only when the two accounts have different currencies'),
});

export const reclassifyExpenseAsTransferResultSchema = z.discriminatedUnion(
  'status',
  [
    z.object({
      status: z.literal('success'),
      converted: z.object({
        transactionId: z.string(),
        transferId: z.string().optional(),
        description: z.string().optional(),
        date: z.string(),
        amountMinor: z.number().int(),
        currencyCode: z.string(),
        fromAccountName: z.string(),
        toAccountName: z.string(),
      }),
    }),
    clarificationResultSchema,
    z.object({ status: z.literal('error'), message: z.string() }),
  ]
);

export type ReclassifyExpenseAsTransferResult = z.infer<
  typeof reclassifyExpenseAsTransferResultSchema
>;

export const MAX_PENDING_EXPENSES = 50;

/**
 * Schema for expenses the user already made but cannot price yet (#117):
 * "hice 3 gastos hoy, te paso los tickets". Each becomes a pending item that
 * waits for its receipt photo; no money moves.
 *
 * @example
 * { count: 3, descriptions: ["Farmacia", "Mercado"] }
 */
export const createPendingExpensesSchema = z.object({
  count: z
    .number()
    .int()
    .describe('How many expenses the user announced without amounts'),
  descriptions: z
    .array(z.string().min(1).max(200))
    .optional()
    .describe(
      'What each expense was, in order, only when the user said it (e.g. "Farmacia"). Omit unknown ones.'
    ),
});

export const createPendingExpensesResultSchema = z.discriminatedUnion(
  'status',
  [
    z.object({
      status: z.literal('success'),
      pending: z.array(z.object({ id: z.string(), name: z.string() })),
    }),
    z.object({ status: z.literal('error'), message: z.string() }),
  ]
);

export type CreatePendingExpensesResult = z.infer<
  typeof createPendingExpensesResultSchema
>;

/**
 * Schema for parameterized filter + aggregate transaction queries
 * (`query_transactions` RPC). Use this for questions like "how much did I
 * spend on food in June" or "break down my spending by category" —
 * anything answerable with filters + an aggregate, not fuzzy text search.
 *
 * @example
 * { category: "Food", dateFrom: "2026-06-01", dateTo: "2026-06-30", aggregate: "sum" }
 * { aggregate: "groupBy", groupByField: "category" }
 */
export const queryTransactionsSchema = z.object({
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  type: z
    .enum(['INCOME', 'EXPENSE'])
    .optional()
    .describe(
      'Filter by transaction type: INCOME for earnings/salary/gains, EXPENSE for spending/costs'
    ),
  amountMin: z
    .number()
    .optional()
    .describe('Minimum amount in major currency units (e.g., 50.00 for $50)'),
  amountMax: z
    .number()
    .optional()
    .describe('Maximum amount in major currency units'),
  category: z.string().optional().describe('Filter by category name'),
  accountName: z.string().optional().describe('Filter by account name'),
  aggregate: z
    .enum(['sum', 'count', 'avg', 'groupBy'])
    .default('sum')
    .describe('Aggregate mode to apply over the filtered transactions'),
  groupByField: z
    .enum(['category', 'account'])
    .optional()
    .describe('Required when aggregate="groupBy": field to group results by'),
});

/**
 * Schema for fuzzy/hybrid transaction search (`hybrid_search_transactions`
 * RPC: vector + full-text + trigram fused via RRF). Use this for questions
 * like "find my Netflix charges" or typo/accent-tolerant merchant lookups —
 * anything that is NOT a clean filter/aggregate query.
 *
 * @example
 * { query: "netflix" }
 * { query: "cafe", limit: 10 }
 */
export const searchTransactionsSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Natural-language or merchant-name search text (typo-tolerant, accent-insensitive)'
    ),
  limit: z
    .number()
    .optional()
    .default(20)
    .describe('Maximum number of results to return'),
});

/**
 * Schema for checking account balance.
 *
 * @example
 * { accountName: "Checking" }
 * {} // Returns all accounts
 */
export const getAccountBalanceSchema = z.object({
  accountName: z
    .string()
    .optional()
    .describe(
      'Specific account name to check. If omitted, returns all accounts.'
    ),
});

/**
 * Structured `getAccountBalance` result: integer minor units, USD-only
 * subtotal, or safe empty/error states. No invented financial data.
 */
export const accountBalanceResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    accounts: z.array(
      z.object({
        name: z.string(),
        balanceMinor: z.number().int(),
        currencyCode: z.string(),
      })
    ),
    usdSubtotalMinor: z.number().int().optional(),
  }),
  z.object({ status: z.literal('empty'), message: z.string() }),
  z.object({ status: z.literal('error'), message: z.string() }),
]);

export type AccountBalanceResult = z.infer<typeof accountBalanceResultSchema>;

/**
 * Schema for creating a financial goal.
 *
 * @example
 * { name: "Emergency Fund", targetAmount: 5000, deadline: "2024-12-31" }
 */
export const createGoalSchema = z.object({
  name: z.string().min(1).describe('Goal name'),
  targetAmount: z
    .number()
    .positive()
    .describe('Target amount in major currency units'),
  deadline: z.string().describe('Deadline date (YYYY-MM-DD)'),
  category: z.string().optional().describe('Optional category for the goal'),
});
