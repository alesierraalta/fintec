'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepository } from '@/providers';
import { useAuth } from './use-auth';
import type { Transaction, Account, Category, CreateTransactionDTO, UpdateTransactionDTO } from '@/types';

// Query keys for consistent caching
export const queryKeys = {
  transactions: ['transactions'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  userTransactions: (userId: string) => ['transactions', 'user', userId] as const,
  userAccounts: (userId: string) => ['accounts', 'user', userId] as const,
  allData: (userId: string) => ['allData', userId] as const,
} as const;

// Custom hook for transactions with React Query
export function useTransactions() {
  const repository = useRepository();
  const { user } = useAuth();

  return useQuery({
    queryKey: user ? queryKeys.userTransactions(user.id) : queryKeys.transactions,
    queryFn: async () => {
      if (!user) return [];
      return await repository.transactions.findAll();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for accounts with React Query
export function useAccounts() {
  const repository = useRepository();
  const { user } = useAuth();

  return useQuery({
    queryKey: user ? queryKeys.userAccounts(user.id) : queryKeys.accounts,
    queryFn: async () => {
      if (!user) return [];
      return await repository.accounts.findByUserId(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes (accounts change less frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Custom hook for categories with React Query
export function useCategories() {
  const repository = useRepository();

  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      return await repository.categories.findAll();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (categories rarely change)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Custom hook for all data with React Query
export function useAllData() {
  const repository = useRepository();
  const { user } = useAuth();

  return useQuery({
    queryKey: user ? queryKeys.allData(user.id) : ['allData'],
    queryFn: async () => {
      if (!user) return { transactions: [], accounts: [], categories: [] };
      
      // Load all data in parallel
      const [transactions, accounts, categories] = await Promise.all([
        repository.transactions.findAll(),
        repository.accounts.findByUserId(user.id),
        repository.categories.findAll(),
      ]);

      return { transactions, accounts, categories };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutation hooks for data updates
export function useCreateTransaction() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateTransactionDTO) => {
      return await repository.transactions.create(data);
    },
    onSuccess: () => {
      // Invalidate and refetch transactions
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userTransactions(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.allData(user.id) });
      }
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
    },
  });
}

export function useUpdateTransaction() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTransactionDTO }) => {
      return await repository.transactions.update(id, data);
    },
    onSuccess: () => {
      // Invalidate and refetch transactions
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userTransactions(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.allData(user.id) });
      }
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
    },
  });
}

export function useDeleteTransaction() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      return await repository.transactions.delete(id);
    },
    onSuccess: () => {
      // Invalidate and refetch transactions
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userTransactions(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.allData(user.id) });
      }
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
    },
  });
}

// Optimized hook that combines all data with computed values
export function useOptimizedData() {
  const { data: allData, isLoading, error, refetch } = useAllData();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  const loading = isLoading || transactionsLoading || accountsLoading || categoriesLoading;

  // Helper functions
  const getAccountName = (accountId?: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'Cuenta';
  };

  const getCategoryName = (categoryId?: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Categoría';
  };

  const getAccountById = (accountId?: string) => {
    return accounts.find(a => a.id === accountId);
  };

  const getCategoryById = (categoryId?: string) => {
    return categories.find(c => c.id === categoryId);
  };

  // Cache management functions
  const invalidateCache = () => {
    // React Query handles cache invalidation automatically
    // This function is kept for backward compatibility
  };

  const isCacheValid = () => {
    // React Query handles cache validation automatically
    return true;
  };

  return {
    // Data
    transactions,
    accounts,
    categories,
    
    // Loading states
    loading,
    error: error?.message || null,
    
    // Load functions (for backward compatibility)
    loadTransactions: () => refetch(),
    loadAccounts: () => refetch(),
    loadCategories: () => refetch(),
    loadAllData: () => refetch(),
    
    // Cache management (for backward compatibility)
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
  const { 
    transactions, 
    accounts, 
    categories, 
    loading, 
    error, 
    loadTransactions, 
    invalidateCache,
    getAccountName,
    getCategoryName,
    getAccountById,
    getCategoryById,
  } = useOptimizedData();

  // Memoized filtered transactions
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
  const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Refresh transactions
  const refreshTransactions = async () => {
    return await loadTransactions();
  };

  return {
    transactions,
    accounts,
    categories,
    expenseTransactions,
    incomeTransactions,
    recentTransactions,
    loading,
    error,
    loadTransactions,
    refreshTransactions,
    invalidateCache,
    getAccountName,
    getCategoryName,
    getAccountById,
    getCategoryById,
  };
}