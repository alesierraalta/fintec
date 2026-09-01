'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { useRepository } from '@/providers';
import { useAuth } from './use-auth';
import type { Account, Category, Transaction } from '@/types';
import {
  MAX_CACHED_TRANSACTIONS,
  createEmptyOptimizedDataCache,
  getOptimizedDataSnapshot,
  invalidateOptimizedDataCache,
  subscribeOptimizedData,
  updateOptimizedDataCache,
  type OptimizedDataDomain,
} from '@/lib/cache/optimized-data-cache';
import { runFinancialMutation, type FinancialDataDomain } from '@/lib/finance/financial-data-sync';

const SERVER_SNAPSHOT = createEmptyOptimizedDataCache();
const CACHE_DURATION: Record<OptimizedDataDomain, number> = {
  transactions: 2 * 60 * 1000,
  accounts: 10 * 60 * 1000,
  categories: 30 * 60 * 1000,
};

export function useOptimizedData() {
  const repository = useRepository();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const snapshot = useSyncExternalStore(
    (listener) => subscribeOptimizedData(userId, listener),
    () => getOptimizedDataSnapshot(userId),
    () => SERVER_SNAPSHOT,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInitialLoad = Boolean(userId) && (
    snapshot.transactions.length === 0 || snapshot.accounts.length === 0
  );
  const isCacheValid = useCallback(
    (domain: OptimizedDataDomain) => Date.now() - snapshot.lastUpdated[domain] < CACHE_DURATION[domain],
    [snapshot],
  );

  const loadDomain = useCallback(async (domain: OptimizedDataDomain, forceRefresh = false) => {
    if (!userId) return [];
    if (!forceRefresh && isCacheValid(domain) && snapshot[domain].length > 0) return snapshot[domain];
    try {
      setLoading(true);
      let data: any[];
      if (domain === 'transactions') data = await repository.transactions.findAll(MAX_CACHED_TRANSACTIONS);
      else if (domain === 'accounts') data = await repository.accounts.findByUserId(userId);
      else data = await repository.categories.findAll();
      updateOptimizedDataCache(userId, { [domain]: data }, [domain]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error loading ${domain}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isCacheValid, repository, snapshot, userId]);

  const loadTransactions = useCallback((force = false) => loadDomain('transactions', force), [loadDomain]);
  const loadAccounts = useCallback((force = false) => loadDomain('accounts', force), [loadDomain]);
  const loadCategories = useCallback((force = false) => loadDomain('categories', force), [loadDomain]);
  const loadAllData = useCallback(async (force = false) => {
    const [transactions, accounts, categories] = await Promise.all([
      loadTransactions(force), loadAccounts(force), loadCategories(force),
    ]);
    return { transactions, accounts, categories };
  }, [loadAccounts, loadCategories, loadTransactions]);
  const invalidateCache = useCallback((domain?: OptimizedDataDomain) => {
    if (userId) invalidateOptimizedDataCache(userId, domain);
  }, [userId]);
  const mutation = useCallback((domains: FinancialDataDomain[], fn: () => Promise<any>) => (
    runFinancialMutation({ userId: userId ?? undefined, repository, domains, mutation: fn })
  ), [repository, userId]);

  const createTransaction = useCallback((data: any) => mutation(
    ['transactions', 'accounts', 'budgets'], () => repository.transactions.create(data),
  ), [mutation, repository]);
  const updateTransaction = useCallback((id: string, data: any) => mutation(
    ['transactions', 'accounts', 'budgets'], () => repository.transactions.update(id, data),
  ), [mutation, repository]);
  const deleteTransaction = useCallback((id: string) => mutation(
    ['transactions', 'accounts', 'budgets'], async () => { await repository.transactions.delete(id); },
  ), [mutation, repository]);
  const createAccount = useCallback((data: any) => mutation(
    ['accounts'], () => repository.accounts.create(data),
  ), [mutation, repository]);
  const updateAccount = useCallback((id: string, data: any) => mutation(
    ['accounts'], () => repository.accounts.update(id, data),
  ), [mutation, repository]);

  return {
    transactions: snapshot.transactions as Transaction[],
    accounts: snapshot.accounts as Account[],
    categories: snapshot.categories as Category[],
    loading: loading || isInitialLoad,
    isInitialLoad,
    error,
    loadTransactions,
    loadAccounts,
    loadCategories,
    loadAllData,
    invalidateCache,
    isCacheValid,
    getAccountName: (id?: string) => snapshot.accounts.find((account) => account.id === id)?.name || 'Cuenta',
    getCategoryName: (id?: string) => snapshot.categories.find((category) => category.id === id)?.name || 'Categoría',
    getAccountById: (id?: string) => snapshot.accounts.find((account) => account.id === id),
    getCategoryById: (id?: string) => snapshot.categories.find((category) => category.id === id),
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createAccount,
    updateAccount,
  };
}

export function useOptimizedTransactions() {
  const data = useOptimizedData();
  const expenseTransactions = useMemo(() => data.transactions.filter((transaction) => transaction.type === 'EXPENSE'), [data.transactions]);
  const incomeTransactions = useMemo(() => data.transactions.filter((transaction) => transaction.type === 'INCOME'), [data.transactions]);
  const recentTransactions = useMemo(() => [...data.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10), [data.transactions]);
  const refreshTransactions = useCallback(async () => {
    data.invalidateCache('transactions');
    return data.loadTransactions(true);
  }, [data]);
  return { ...data, expenseTransactions, incomeTransactions, recentTransactions, refreshTransactions };
}
