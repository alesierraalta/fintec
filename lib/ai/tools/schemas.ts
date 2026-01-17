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
 * Schema for searching transactions.
 * 
 * @example
 * { query: "coffee", limit: 5 }
 * { startDate: "2024-01-01", endDate: "2024-01-31" }
 */
export const getTransactionsSchema = z.object({
    query: z.string().optional().describe('Search query (e.g., "coffee", "Walmart") for semantic search'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    category: z.string().optional().describe('Filter by category name'),
    accountName: z.string().min(1).optional().describe('Filter by account name (e.g., "Binance", "Cartera"). Case-insensitive.'),
    limit: z.number().optional().default(5).describe('Number of transactions to return'),
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
