'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRepository } from '@/providers';
import { useAuth } from './use-auth';
import type { Transaction, Account, Category } from '@/types';
import {
  createEmptyOptimizedDataCache,
  loadOptimizedDataCache,
  persistOptimizedDataCache,
  type OptimizedDataCache,
} from '@/lib/cache/optimized-data-cache';

// Cache interface
interface DataCache extends OptimizedDataCache {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

// Cache durations in milliseconds - diferenciadas por tipo de dato
const CACHE_DURATION = {
  transactions: 2 * 60 * 1000, // 2 minutos (cambian frecuentemente)
  accounts: 10 * 60 * 1000, // 10 minutos (cambian poco)
  categories: 30 * 60 * 1000, // 30 minutos (casi estáticas)
};

// Global cache to persist across component unmounts
let globalCache: DataCache = createEmptyOptimizedDataCache();
let activeCacheUserId: string | null = null;

const persistActiveCache = () => {
  if (!activeCacheUserId) return;
  persistOptimizedDataCache(activeCacheUserId, globalCache);
};

export function useOptimizedData() {
  const repository = useRepository();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    return (
      globalCache.transactions.length === 0 || globalCache.accounts.length === 0
    );
  });

  useEffect(() => {
    const userId = user?.id ?? null;

    if (!userId) {
      activeCacheUserId = null;
      globalCache = createEmptyOptimizedDataCache();
      setIsInitialLoad(true);
      return;
    }

    if (activeCacheUserId !== userId) {
      activeCacheUserId = userId;
      globalCache =
        (loadOptimizedDataCache(userId) as DataCache | null) ||
        createEmptyOptimizedDataCache();
      setIsInitialLoad(
        globalCache.transactions.length === 0 ||
          globalCache.accounts.length === 0
      );
      return;
    }

    if (!isInitialLoad) return;

    const hasCachedData =
      globalCache.transactions.length > 0 ||
      globalCache.accounts.length > 0 ||
      globalCache.categories.length > 0;

    if (hasCachedData) {
      setIsInitialLoad(false);
    }
  }, [user?.id, isInitialLoad]);

  // Check if cache is valid with differentiated durations
  const isCacheValid = useCallback((type: keyof DataCache['lastUpdated']) => {
    const lastUpdated = globalCache.lastUpdated[type];
    const duration = CACHE_DURATION[type];
    return Date.now() - lastUpdated < duration;
  }, []);

  // Load transactions with caching
  const loadTransactions = useCallback(
    async (forceRefresh = false) => {
      if (!user) return [];

      // Check for stale cache - if all transactions are INCOME, likely stale
      if (
        !forceRefresh &&
        isCacheValid('transactions') &&
        globalCache.transactions.length > 0
      ) {
        const allIncome = globalCache.transactions.every(
          (t) => t.type === 'INCOME'
        );
        if (allIncome && globalCache.transactions.length > 2) {
          forceRefresh = true;
        } else {
          return globalCache.transactions;
        }
      }

      try {
        setLoading(true);
        // * Optimization: Load only recent 150 transactions initially to save bandwidth
        // Pagination/Infinite scroll handles older history when needed
        const transactions = await repository.transactions.findAll(150);
        globalCache.transactions = transactions;
        globalCache.lastUpdated.transactions = Date.now();
        persistActiveCache();
        return transactions;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error loading transactions'
        );
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user, repository, isCacheValid]
  );

  // Load accounts with caching
  const loadAccounts = useCallback(
    async (forceRefresh = false) => {
      if (!user) return [];

      if (
        !forceRefresh &&
        isCacheValid('accounts') &&
        globalCache.accounts.length > 0
      ) {
        return globalCache.accounts;
      }

      try {
        setLoading(true);
        const accounts = await repository.accounts.findByUserId(user.id);
        globalCache.accounts = accounts;
        globalCache.lastUpdated.accounts = Date.now();
        persistActiveCache();
        return accounts;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading accounts');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user, repository, isCacheValid]
  );

  // Load categories with caching
  const loadCategories = useCallback(
    async (forceRefresh = false) => {
      if (
        !forceRefresh &&
        isCacheValid('categories') &&
        globalCache.categories.length > 0
      ) {
        return globalCache.categories;
      }

      try {
        setLoading(true);
        const categories = await repository.categories.findAll();
        globalCache.categories = categories;
        globalCache.lastUpdated.categories = Date.now();
        persistActiveCache();
        return categories;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error loading categories'
        );
        return [];
      } finally {
        setLoading(false);
      }
    },
    [repository, isCacheValid]
  );

  // Load all data efficiently
  const loadAllData = useCallback(
    async (forceRefresh = false) => {
      if (!user) return { transactions: [], accounts: [], categories: [] };

      try {
        setError(null);

        // Load data in parallel, using cache when possible
        const [transactions, accounts, categories] = await Promise.all([
          loadTransactions(forceRefresh),
          loadAccounts(forceRefresh),
          loadCategories(forceRefresh),
        ]);

        // Mark initial load as complete if we have any data
        if (
          transactions.length > 0 ||
          accounts.length > 0 ||
          categories.length > 0
        ) {
          setIsInitialLoad(false);
        }

        return { transactions, accounts, categories };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data');
        return { transactions: [], accounts: [], categories: [] };
      }
    },
    [user, loadTransactions, loadAccounts, loadCategories]
  );

  // Invalidate cache for specific data type
  const invalidateCache = useCallback(
    (type?: keyof DataCache['lastUpdated']) => {
      if (type) {
        globalCache.lastUpdated[type] = 0;
        globalCache[type] = [];
      } else {
        // Invalidate all cache
        globalCache = createEmptyOptimizedDataCache();
        // Reset initial load state when cache is cleared
        setIsInitialLoad(true);
      }

      persistActiveCache();
    },
    []
  );

  // Memoized helper functions
  const getAccountName = useCallback((accountId?: string) => {
    return (
      globalCache.accounts.find((a) => a.id === accountId)?.name || 'Cuenta'
    );
  }, []);

  const getCategoryName = useCallback((categoryId?: string) => {
    return (
      globalCache.categories.find((c) => c.id === categoryId)?.name ||
      'Categoría'
    );
  }, []);

  const getAccountById = useCallback((accountId?: string) => {
    return globalCache.accounts.find((a) => a.id === accountId);
  }, []);

  const getCategoryById = useCallback((categoryId?: string) => {
    return globalCache.categories.find((c) => c.id === categoryId);
  }, []);

  // Memoized computed values
  const cachedData = {
    transactions: globalCache.transactions,
    accounts: globalCache.accounts,
    categories: globalCache.categories,
  };

  // Determine if we should show loading state
  const needsData =
    globalCache.transactions.length === 0 || globalCache.accounts.length === 0;
  const shouldShowLoading = isInitialLoad && needsData;

  // Mutation functions with auto-invalidation
  const createTransaction = useCallback(
    async (data: any) => {
      const result = await repository.transactions.create(data);
      invalidateCache('transactions'); // Auto-invalidar cache de transacciones
      return result;
    },
    [repository, invalidateCache]
  );

  const updateTransaction = useCallback(
    async (id: string, data: any) => {
      const result = await repository.transactions.update(id, data);
      invalidateCache('transactions'); // Auto-invalidar cache de transacciones
      return result;
    },
    [repository, invalidateCache]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await repository.transactions.delete(id);
      invalidateCache('transactions'); // Auto-invalidar cache de transacciones
    },
    [repository, invalidateCache]
  );

  const createAccount = useCallback(
    async (data: any) => {
      const result = await repository.accounts.create(data);
      invalidateCache('accounts'); // Auto-invalidar cache de cuentas
      return result;
    },
    [repository, invalidateCache]
  );

  const updateAccount = useCallback(
    async (id: string, data: any) => {
      const result = await repository.accounts.update(id, data);
      invalidateCache('accounts'); // Auto-invalidar cache de cuentas
      return result;
    },
    [repository, invalidateCache]
  );

  return {
    // Data
    ...cachedData,

    // Loading states
    loading: shouldShowLoading,
    isInitialLoad,
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

    // Mutation functions with auto-invalidation
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createAccount,
    updateAccount,
  };
}

// Hook for transaction-specific optimizations
export function useOptimizedTransactions() {
  const { transactions, loadTransactions, invalidateCache, ...rest } =
    useOptimizedData();

  // Memoized filtered transactions
  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'EXPENSE'),
    [transactions]
  );

  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'INCOME'),
    [transactions]
  );

  const recentTransactions = useMemo(
    () =>
      transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10),
    [transactions]
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
