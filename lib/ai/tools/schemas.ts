import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().describe('The amount of the transaction'),
  description: z.string().describe('Description of the transaction'),
  category: z.string().describe('Category name (e.g., Food, Transport)'),
  date: z.string().optional().describe('ISO date string (YYYY-MM-DD). Defaults to today if not specified.'),
  accountName: z.string().optional().describe('Name of the account to use. If not specified, asks for clarification or uses default.'),
  type: z.enum(['INCOME', 'EXPENSE']).default('EXPENSE').describe('Type of transaction'),
});

export const getTransactionsSchema = z.object({
  query: z.string().optional().describe('Search query (e.g., "coffee", "Walmart") for semantic search'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  category: z.string().optional().describe('Filter by category name'),
  limit: z.number().optional().default(5).describe('Number of transactions to return'),
});

export const getAccountBalanceSchema = z.object({
  accountName: z.string().optional().describe('Specific account name to check. If omitted, returns all accounts.'),
});

export const getBudgetAnalysisSchema = z.object({
  month: z.number().optional().describe('Month number (1-12)'),
  year: z.number().optional().describe('Year'),
});
