import * as schemas from './schemas';
import { formatTransactionsList, formatAccountBalance, formatGoalCreated, formatTransactionCreated } from './formatters';
import { SupabaseAccountsRepository } from '@/repositories/supabase/accounts-repository-impl';
import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';
import { SupabaseGoalsRepository } from '@/repositories/supabase/goals-repository-impl';
import { SupabaseCategoriesRepository } from '@/repositories/supabase/categories-repository-impl';
import { TransactionType, type TransactionFilters } from '@/types/domain';
import { analyzeSpending, formatInsights, type TransactionWithAccount } from '../insights';
import type { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type inference from schemas
type GetTransactionsArgs = z.infer<typeof schemas.getTransactionsSchema>;
type CreateTransactionArgs = z.infer<typeof schemas.createTransactionSchema>;
type GetAccountBalanceArgs = z.infer<typeof schemas.getAccountBalanceSchema>;
type CreateGoalArgs = z.infer<typeof schemas.createGoalSchema>;

interface ToolContext {
    userId: string;
    supabase: SupabaseClient;
}

/**
 * Creates a new financial transaction.
 */
export async function createTransaction(
    args: CreateTransactionArgs,
    ctx: ToolContext
): Promise<string> {
    try {
        const accountsRepo = new SupabaseAccountsRepository(ctx.supabase);
        const categoriesRepo = new SupabaseCategoriesRepository();
        const transactionsRepo = new SupabaseTransactionsRepository(ctx.supabase);

        // 1. Resolve Account
        const accounts = await accountsRepo.findByUserId(ctx.userId);

        if (accounts.length === 0) {
            throw new Error('No accounts found. Please create an account first.');
        }

        let accountId = accounts.find(
            a => a.name.toLowerCase() === args.accountName?.toLowerCase()
        )?.id;

        if (!accountId) {
            // Default to first account
            accountId = accounts[0].id;
            console.log(`[AI] Defaulting to account: ${accounts[0].name}`);
        }

        // 2. Resolve Category
        const categories = await categoriesRepo.findAll();
        const userCategories = categories.filter(c => c.userId === ctx.userId);

        let categoryId = userCategories.find(
            c => c.name.toLowerCase() === args.category?.toLowerCase()
        )?.id;

        if (!categoryId) {
            // Fallback to "General" or first category
            const fallback = userCategories.find(c => c.name === 'General' || c.name === 'Uncategorized');
            categoryId = fallback?.id || userCategories[0]?.id;

            if (!categoryId) {
                console.log('[AI] Defaulting to first category found for user');
                categoryId = userCategories[0]?.id; // Ensure we have SOME category
                if (!categoryId) {
                    // Check if global categories exist
                    const allCats = await categoriesRepo.findAll();
                    const globalFallback = allCats.find(c => c.name === 'General' || c.name === 'Uncategorized');
                    categoryId = globalFallback?.id;
                }
                if (!categoryId) throw new Error('No categories found. Please create a category first.');
            } else {
                console.log(`[AI] Defaulting to category: ${userCategories.find(c => c.id === categoryId)?.name}`);
            }
        }

        // 3. Create Transaction
        const account = accounts.find(a => a.id === accountId);
        const category = userCategories.find(c => c.id === categoryId);

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
        throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Searches for past transactions.
 */
export async function getTransactions(
    args: GetTransactionsArgs,
    ctx: ToolContext
): Promise<string> {
    try {
        const accountsRepo = new SupabaseAccountsRepository(ctx.supabase);
        const transactionsRepo = new SupabaseTransactionsRepository(ctx.supabase);

        // Get user's accounts
        const accounts = await accountsRepo.findByUserId(ctx.userId);
        let accountIds = accounts.map(a => a.id);

        // Create account ID → name map for fast lookup
        const accountMap = new Map(accounts.map(a => [a.id, a.name]));

        if (accountIds.length === 0) {
            return 'No accounts found for your user.';
        }

        // Filter by account name if specified
        if (args.accountName) {
            const normalizedInput = args.accountName.trim().toLowerCase();

            const account = accounts.find(
                a => a.name.trim().toLowerCase() === normalizedInput
            );

            if (!account) {
                // Truncate account list if too long
                const accountNames = accounts.map(a => a.name);
                const accountList = accountNames.length > 10
                    ? accountNames.slice(0, 10).join(', ') + ` (y ${accountNames.length - 10} más)`
                    : accountNames.join(', ');

                return `❌ Cuenta no encontrada: ${args.accountName}. Disponibles: ${accountList}`;
            }

            accountIds = [account.id]; // Restrict to single account
        }

        // Build filters
        const filters: TransactionFilters = {
            accountIds,
            dateFrom: args.startDate,
            dateTo: args.endDate,
        };

        // Execute search
        const transactions = await transactionsRepo.findWithFilters(filters);

        if (transactions.length === 0) {
            return 'No transactions found matching your criteria.';
        }

        // Enrich transactions with account names (single pass, O(n))
        const enrichedTransactions: TransactionWithAccount[] = transactions.map(tx => ({
            ...tx,
            accountName: accountMap.get(tx.accountId) || 'Unknown',
        }));

        // Generate autonomous insights
        const insights = analyzeSpending(enrichedTransactions);
        const insightsText = formatInsights(insights);

        // Format results using new formatter + insights
        const transactionsList = formatTransactionsList(enrichedTransactions, args.limit || 10);

        return transactionsList + insightsText;
    } catch (error) {
        throw new Error(`Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const accountsRepo = new SupabaseAccountsRepository(ctx.supabase);

        const accounts = await accountsRepo.findByUserId(ctx.userId);

        if (accounts.length === 0) {
            return 'No accounts found for your user.';
        }

        // Filter by account name if provided
        let accountsToShow = accounts;

        if (args.accountName) {
            const account = accounts.find(
                a => a.name.toLowerCase().includes(args.accountName!.toLowerCase())
            );

            if (!account) {
                return `❌ Cuenta "${args.accountName}" no encontrada.`;
            }

            accountsToShow = [account];
        }

        return formatAccountBalance(accountsToShow);
    } catch (error) {
        throw new Error(`Failed to get account balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const goalsRepo = new SupabaseGoalsRepository(ctx.supabase);

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
        throw new Error(`Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Exported resolvers object for use in AI route.
 */
export const toolsResolvers = {
    createTransaction,
    getTransactions,
    getAccountBalance,
    createGoal,
};
