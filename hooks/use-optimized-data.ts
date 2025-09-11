'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRepository } from '@/providers';
import { useAuth } from './use-auth';
import type { Transaction, Account, Category } from '@/types';

// Cache interface
interface DataCache {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  lastUpdated: {
    transactions: number;
    accounts: number;
    categories: number;
  };
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Global cache to persist across component unmounts
let globalCache: DataCache = {
  transactions: [],
  accounts: [],
  categories: [],
  lastUpdated: {
    transactions: 0,
    accounts: 0,
    categories: 0,
  },
};

export function useOptimizedData() {
  const repository = useRepository();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if cache is valid
  const isCacheValid = useCallback((type: keyof DataCache['lastUpdated']) => {
    const lastUpdated = globalCache.lastUpdated[type];
    return Date.now() - lastUpdated < CACHE_DURATION;
  }, []);

  // Load transactions with caching
  const loadTransactions = useCallback(async (forceRefresh = false) => {
    if (!user) return [];
    
    if (!forceRefresh && isCacheValid('transactions') && globalCache.transactions.length > 0) {
      return globalCache.transactions;
    }

    try {
      setLoading(true);
      const transactions = await repository.transactions.findAll();
      globalCache.transactions = transactions;
      globalCache.lastUpdated.transactions = Date.now();
      return transactions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading transactions');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, repository, isCacheValid]);

  // Load accounts with caching
  const loadAccounts = useCallback(async (forceRefresh = false) => {
    if (!user) return [];
    
    if (!forceRefresh && isCacheValid('accounts') && globalCache.accounts.length > 0) {
      return globalCache.accounts;
    }

    try {
      setLoading(true);
      const accounts = await repository.accounts.findByUserId(user.id);
      globalCache.accounts = accounts;
      globalCache.lastUpdated.accounts = Date.now();
      return accounts;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading accounts');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, repository, isCacheValid]);

  // Load categories with caching
  const loadCategories = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('categories') && globalCache.categories.length > 0) {
      return globalCache.categories;
    }

    try {
      setLoading(true);
      const categories = await repository.categories.findAll();
      globalCache.categories = categories;
      globalCache.lastUpdated.categories = Date.now();
      return categories;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading categories');
      return [];
    } finally {
      setLoading(false);
    }
  }, [repository, isCacheValid]);

  // Load all data efficiently
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!user) return { transactions: [], accounts: [], categories: [] };

    try {
      setLoading(true);
      setError(null);

      // Load data in parallel, using cache when possible
      const [transactions, accounts, categories] = await Promise.all([
        loadTransactions(forceRefresh),
        loadAccounts(forceRefresh),
        loadCategories(forceRefresh),
      ]);

      return { transactions, accounts, categories };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
      return { transactions: [], accounts: [], categories: [] };
    } finally {
      setLoading(false);
    }
  }, [user, loadTransactions, loadAccounts, loadCategories]);

  // Invalidate cache for specific data type
  const invalidateCache = useCallback((type?: keyof DataCache['lastUpdated']) => {
    if (type) {
      globalCache.lastUpdated[type] = 0;
      globalCache[type] = [];
    } else {
      // Invalidate all cache
      globalCache = {
        transactions: [],
        accounts: [],
        categories: [],
        lastUpdated: {
          transactions: 0,
          accounts: 0,
          categories: 0,
        },
      };
    }
  }, []);

  // Memoized helper functions
  const getAccountName = useCallback((accountId?: string) => {
    return globalCache.accounts.find(a => a.id === accountId)?.name || 'Cuenta';
  }, []);

  const getCategoryName = useCallback((categoryId?: string) => {
    return globalCache.categories.find(c => c.id === categoryId)?.name || 'Categoría';
  }, []);

  const getAccountById = useCallback((accountId?: string) => {
    return globalCache.accounts.find(a => a.id === accountId);
  }, []);

  const getCategoryById = useCallback((categoryId?: string) => {
    return globalCache.categories.find(c => c.id === categoryId);
  }, []);

  // Memoized computed values
  const cachedData = useMemo(() => ({
    transactions: globalCache.transactions,
    accounts: globalCache.accounts,
    categories: globalCache.categories,
  }), [globalCache.transactions, globalCache.accounts, globalCache.categories]);

  return {
    // Data
    ...cachedData,
    
    // Loading states
    loading,
    error,
    
    // Load functions
    loadTransactions,
    loadAccounts,
    loadCategories,
    loadAllData,
    
    // Cache management
    invalidateCache,
    isCacheValid,
    
    // Helper functions
    getAccountName,
    getCategoryName,
    getAccountById,
    getCategoryById,
  };
}

// Hook for transaction-specific optimizations
export function useOptimizedTransactions() {
  const { transactions, loadTransactions, invalidateCache, ...rest } = useOptimizedData();
  
  // Memoized filtered transactions
  const expenseTransactions = useMemo(() => 
    transactions.filter(t => t.type === 'EXPENSE'), [transactions]
  );
  
  const incomeTransactions = useMemo(() => 
    transactions.filter(t => t.type === 'INCOME'), [transactions]
  );
  
  const recentTransactions = useMemo(() => 
    transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10), [transactions]
  );

  // Refresh transactions and invalidate cache
  const refreshTransactions = useCallback(async () => {
    invalidateCache('transactions');
    return await loadTransactions(true);
  }, [loadTransactions, invalidateCache]);

  return {
    transactions,
    expenseTransactions,
    incomeTransactions,
    recentTransactions,
    loadTransactions,
    refreshTransactions,
    ...rest,
  };
}