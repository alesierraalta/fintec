'use client';

import type { AppRepository } from '@/repositories/contracts';
import {
  batchOptimizedDataUpdates,
  invalidateOptimizedDataCache,
  updateOptimizedDataCache,
  type OptimizedDataDomain,
} from '@/lib/cache/optimized-data-cache';
import { logger } from '@/lib/utils/logger';

export type FinancialDataDomain = 'transactions' | 'accounts' | 'budgets' | 'categories';
export interface FinancialDataEvent {
  userId: string;
  domains: FinancialDataDomain[];
}
export interface FinancialMutationOptions<T> {
  userId?: string;
  repository: AppRepository;
  domains: FinancialDataDomain[];
  mutation: () => Promise<T>;
}

type Listener = (event: FinancialDataEvent) => void | Promise<void>;
const eventListeners = new Map<string, Set<Listener>>();
const activeReloads = new Map<string, ReloadEntry>();
const mutationQueues = new Map<string, Promise<void>>();

function uniqueDomains(domains: FinancialDataDomain[]): FinancialDataDomain[] {
  return [...new Set(domains)];
}

function cacheDomains(domains: FinancialDataDomain[]): OptimizedDataDomain[] {
  return uniqueDomains(domains).filter(
    (domain): domain is OptimizedDataDomain => domain !== 'budgets',
  );
}

export function subscribeFinancialData(userId: string, listener: Listener): () => void {
  const scopedListeners = eventListeners.get(userId) ?? new Set<Listener>();
  scopedListeners.add(listener);
  eventListeners.set(userId, scopedListeners);
  return () => {
    scopedListeners.delete(listener);
    if (scopedListeners.size === 0) eventListeners.delete(userId);
  };
}

export async function emitFinancialDataChange(
  userId: string,
  domains: FinancialDataDomain[],
): Promise<void> {
  const event: FinancialDataEvent = { userId, domains: uniqueDomains(domains) };
  const listeners = [...(eventListeners.get(userId) ?? [])];
  await Promise.all(
    listeners.map(async (listener) => {
      try {
        await listener(event);
      } catch (error) {
        logger.warn('[financial-data-sync] page refresh listener failed', {
          error,
          userId,
          domains: event.domains,
        });
      }
    }),
  );
}

interface ReloadEntry {
  repository: AppRepository;
  domains: Set<FinancialDataDomain>;
  promise: Promise<void>;
}

export async function reloadFinancialData(
  repository: AppRepository,
  userId: string,
  domains: FinancialDataDomain[] = ['transactions', 'accounts', 'categories'],
): Promise<void> {
  const existing = activeReloads.get(userId);
  if (existing) {
    uniqueDomains(domains).forEach((domain) => existing.domains.add(domain));
    return existing.promise;
  }

  const entry = {} as ReloadEntry;
  entry.repository = repository;
  entry.domains = new Set(uniqueDomains(domains));
  entry.promise = (async () => {
    try {
      // Let same-turn callers contribute domains before fetching one snapshot.
      await Promise.resolve();
      // A reload may gain domains while its request is in flight. Finish those
      // domains before resolving so callers never lose an invalidation.
      do {
        const requested = [...entry.domains];
        entry.domains.clear();
        const cacheRequested = cacheDomains(requested);
        if (cacheRequested.length === 0) continue;

        const [transactions, accounts, categories] = await Promise.all([
          cacheRequested.includes('transactions')
            ? entry.repository.transactions.findAll(150)
            : undefined,
          cacheRequested.includes('accounts')
            ? entry.repository.accounts.findByUserId(userId)
            : undefined,
          cacheRequested.includes('categories')
            ? entry.repository.categories.findAll()
            : undefined,
        ]);
        const patch: Partial<Record<OptimizedDataDomain, any[]>> = {};
        if (transactions) patch.transactions = transactions;
        if (accounts) patch.accounts = accounts;
        if (categories) patch.categories = categories;
        batchOptimizedDataUpdates(() => {
          updateOptimizedDataCache(userId, patch, cacheRequested);
        });
      } while (entry.domains.size > 0);
    } finally {
      activeReloads.delete(userId);
    }
  })();
  activeReloads.set(userId, entry);
  return entry.promise;
}

function scheduleRetry(
  repository: AppRepository,
  userId: string,
  domains: FinancialDataDomain[],
  attempt = 0,
): void {
  if (attempt >= 3) return;
  const delay = 500 * (attempt + 1);
  const retry = setTimeout(() => {
    pendingRetries.delete(userId);
    void reloadFinancialData(repository, userId, domains)
      .then(() => emitFinancialDataChange(userId, domains))
      .catch(() => scheduleRetry(repository, userId, domains, attempt + 1));
  }, delay);
  pendingRetries.set(userId, retry);
}
const pendingRetries = new Map<string, ReturnType<typeof setTimeout>>();

export async function runFinancialMutation<T>(options: FinancialMutationOptions<T>): Promise<T> {
  if (!options.userId) throw new Error('Authentication required');

  const userId = options.userId;
  const previous = mutationQueues.get(userId) ?? Promise.resolve();
  const current = previous.then(async () => {
    const result = await options.mutation();
    const domains = uniqueDomains(options.domains);
    const invalidated = cacheDomains(domains);
    batchOptimizedDataUpdates(() => {
      invalidated.forEach((domain) => invalidateOptimizedDataCache(userId, domain));
    });

    try {
      await reloadFinancialData(options.repository, userId, domains);
      await emitFinancialDataChange(userId, domains);
    } catch (error) {
      logger.error('[financial-data-sync] authoritative refresh failed after committed mutation', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        domains,
      });
      scheduleRetry(options.repository, userId, domains);
    }
    return result;
  });
  const queued = current.then(() => undefined, () => undefined);
  mutationQueues.set(userId, queued);
  void queued.then(() => {
    if (mutationQueues.get(userId) === queued) mutationQueues.delete(userId);
  });
  return current;
}

interface PendingRealtimeRefresh {
  repository: AppRepository;
  domains: Set<FinancialDataDomain>;
  timer: ReturnType<typeof setTimeout>;
}
const pendingRealtime = new Map<string, PendingRealtimeRefresh>();

export function scheduleFinancialRealtimeRefresh(
  repository: AppRepository,
  userId: string,
  domains: FinancialDataDomain[],
  delay = 50,
): void {
  const current = pendingRealtime.get(userId);
  if (current) {
    uniqueDomains(domains).forEach((domain) => current.domains.add(domain));
    return;
  }

  const entry: PendingRealtimeRefresh = {
    repository,
    domains: new Set(uniqueDomains(domains)),
    timer: setTimeout(() => {
      pendingRealtime.delete(userId);
      const requested = [...entry.domains];
      void reloadFinancialData(repository, userId, requested)
        .then(() => emitFinancialDataChange(userId, requested))
        .catch((error) => {
          logger.warn('[financial-data-sync] realtime authoritative refresh failed', { error, userId });
          scheduleRetry(repository, userId, requested);
        });
    }, delay),
  };
  pendingRealtime.set(userId, entry);
}

export function cancelFinancialRealtimeRefresh(userId: string): void {
  const pending = pendingRealtime.get(userId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingRealtime.delete(userId);
  }
  const retry = pendingRetries.get(userId);
  if (retry) {
    clearTimeout(retry);
    pendingRetries.delete(userId);
  }
}
