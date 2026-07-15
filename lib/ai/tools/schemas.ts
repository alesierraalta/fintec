import { z } from 'zod';

/**
 * Schema for creating a financial transaction via AI.
 * 
 * @example
 * { amount: 50, description: "Coffee", category: "Food", type: "EXPENSE" }
 */
export const createTransactionSchema = z.object({
    amount: z.number().positive().describe('Amount in major currency units (e.g., 50.00 for $50)'),
    description: z.string().min(1).describe('Transaction description'),
    category: z.string().describe('Category name (e.g., Food, Transport)'),
    accountName: z.string().optional().describe('Account name. If omitted, uses default account.'),
    type: z.enum(['INCOME', 'EXPENSE']).default('EXPENSE').describe('Type of transaction'),
    date: z.string().optional().describe('ISO date string (YYYY-MM-DD). Defaults to today if not specified.'),
});

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
    amountMin: z.number().optional().describe('Minimum amount in major currency units (e.g., 50.00 for $50)'),
    amountMax: z.number().optional().describe('Maximum amount in major currency units'),
    category: z.string().optional().describe('Filter by category name'),
    accountName: z.string().optional().describe('Filter by account name'),
    aggregate: z.enum(['sum', 'count', 'avg', 'groupBy']).default('sum').describe('Aggregate mode to apply over the filtered transactions'),
    groupByField: z.enum(['category', 'account']).optional().describe('Required when aggregate="groupBy": field to group results by'),
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
    query: z.string().min(1).describe('Natural-language or merchant-name search text (typo-tolerant, accent-insensitive)'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return'),
});

/**
 * Schema for checking account balance.
 * 
 * @example
 * { accountName: "Checking" }
 * {} // Returns all accounts
 */
export const getAccountBalanceSchema = z.object({
    accountName: z.string().optional().describe('Specific account name to check. If omitted, returns all accounts.'),
});

/**
 * Schema for creating a financial goal.
 * 
 * @example
 * { name: "Emergency Fund", targetAmount: 5000, deadline: "2024-12-31" }
 */
export const createGoalSchema = z.object({
    name: z.string().min(1).describe('Goal name'),
    targetAmount: z.number().positive().describe('Target amount in major currency units'),
    deadline: z.string().describe('Deadline date (YYYY-MM-DD)'),
    category: z.string().optional().describe('Optional category for the goal'),
});
