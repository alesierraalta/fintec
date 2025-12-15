import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';
import { SupabaseAccountsRepository } from '@/repositories/supabase/accounts-repository-impl';
import { SupabaseCategoriesRepository } from '@/repositories/supabase/categories-repository-impl';
import { generateEmbedding, searchTransactions } from '../embeddings';
import { supabase } from '@/repositories/supabase/client';
import { TransactionType } from '@/types';
import { logger } from '@/lib/utils/logger';

const transactionsRepo = new SupabaseTransactionsRepository();
const accountsRepo = new SupabaseAccountsRepository();
const categoriesRepo = new SupabaseCategoriesRepository();

export const toolsResolvers = {
  createTransaction: async ({ amount, description, category, date, accountName, type }: any, { userId }: { userId: string }) => {
    // 1. Resolve Account
    const accounts = await accountsRepo.findByUserId(userId);
    let accountId = accounts.find(a => a.name.toLowerCase() === accountName?.toLowerCase())?.id;
    if (!accountId && accounts.length > 0) {
      // Default to first active account if not specified or found
      // In a real agent, we might ask for clarification, but for tool execution we default for now
      accountId = accounts[0].id;
      logger.info(`[AI Agent] Defaulting to account: ${accounts[0].name}`);
    }
    if (!accountId) throw new Error('No accounts found for user.');

    // 2. Resolve Category
    const categories = await categoriesRepo.findAll(); // Assuming findAll filters by user internally or we filter manually
    // Filter categories by user (assuming category.userId or a system flag)
    const userCategories = categories.filter(c => c.userId === userId); // Removed || c.isSystem
    
    let categoryId = userCategories.find(c => c.name.toLowerCase() === category?.toLowerCase())?.id;
    if (!categoryId) {
        // Fallback: pick "General" or "Uncategorized"
        const uncategorized = userCategories.find(c => c.name === 'General' || c.name === 'Uncategorized');
        categoryId = uncategorized?.id || userCategories[0]?.id;
        if (categoryId) {
          logger.info(`[AI Agent] Defaulting to category: ${userCategories.find(c => c.id === categoryId)?.name}`);
        } else {
          throw new Error('No categories found for user.');
        }
    }

    // 3. Create Transaction
    const transaction = await transactionsRepo.create({
      amountMinor: Math.round(amount * 100), // Convert to minor units
      description,
      categoryId,
      accountId: accountId!,
      date: date || new Date().toISOString().split('T')[0],
      type: type as TransactionType,
      currencyCode: accounts.find(a => a.id === accountId)?.currencyCode || 'USD',
      // userId: userId, // Ensure userId is passed if needed by repo - removed as per CreateTransactionDTO
    });

    // 4. Generate & Save Embedding
    try {
      const embedding = await generateEmbedding(`${description} ${category || ''}`);
      // Supabase `update` expects `number[]` for vector type, not stringified JSON
      await (supabase as any) // Cast to any because `embedding` column is new
        .from('transactions')
        .update({ embedding: embedding }) // Direct embedding array
        .eq('id', transaction.id);
    } catch (e) {
      logger.error('[AI Agent] Failed to generate or save embedding for transaction:', e);
    }

    return `Transaction created: ${description} for $${amount}. ID: ${transaction.id}`;
  },

  getTransactions: async ({ query, startDate, endDate, limit }: any, { userId }: { userId: string }) => {
    if (query) {
      // Semantic Search
      const results = await searchTransactions(userId, query, 0.6, limit);
      return results.map(r => ({
        date: r.date,
        description: r.description,
        amount: r.amount_base_minor / 100,
        similarity: r.similarity
      }));
    }

    // Standard SQL Search (Simplified)
    const filters: any = {
        dateFrom: startDate,
        dateTo: endDate,
    };
    
    const accounts = await accountsRepo.findByUserId(userId);
    const accountIds = accounts.map(a => a.id);
    filters.accountIds = accountIds;

    const transactions = await transactionsRepo.findWithFilters(filters);
    if (transactions.length === 0) return `No transactions found matching your criteria.`;
    const formattedTransactions = transactions.slice(0, limit).map(t => `${t.description} on ${t.date} for $${t.amountBaseMinor / 100}`).join('; ');
    return `Found ${transactions.length} transactions: ${formattedTransactions}.`;
  },

  getAccountBalance: async ({ accountName }: any, { userId }: { userId: string }) => {
    const accounts = await accountsRepo.findByUserId(userId);
    if (accountName) {
      const account = accounts.find(a => a.name.toLowerCase().includes(accountName.toLowerCase()));
      if (!account) return `Account "${accountName}" not found.`;
      return `Account "${account.name}" balance: $${account.balance / 100} ${account.currencyCode}.`;
    }
    if (accounts.length === 0) return `No accounts found for your user.`;
    return `Balances: ${accounts.map(a => `${a.name}: $${a.balance / 100} ${a.currencyCode}`).join('; ')}.`;
  },
  
  getBudgetAnalysis: async ({ month, year }: any, { userId }: { userId: string }) => {
      return "Budget analysis feature is not yet fully implemented. Please try again later.";
  }
};

