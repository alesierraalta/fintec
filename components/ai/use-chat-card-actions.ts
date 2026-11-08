'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { compressImage } from '@/hooks/use-receipt-scanner';
import { runFinancialMutation } from '@/lib/finance/financial-data-sync';
import { logger } from '@/lib/utils/logger';
import type { ScanReceiptResponse } from '@/lib/ai/receipt-scanner/types';
import type { ChatActions } from './chat-actions';

const MONEY_DOMAINS = ['transactions', 'accounts', 'budgets'] as const;

/**
 * Wires the chat cards to the user's data: undo, category changes, receipt
 * scanning and settling amount-less expenses. Every write goes through
 * runFinancialMutation so balances and caches stay in sync.
 */
export function useChatCardActions(reply: (text: string) => void): ChatActions {
  const repository = useRepository();
  const { user } = useAuth();
  const userId = user?.id;
  const [categories, setCategories] = useState<ChatActions['categories']>([]);
  const [accounts, setAccounts] = useState<ChatActions['accounts']>([]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    Promise.all([
      repository.categories.findAll(),
      repository.accounts.findByUserId(userId),
    ])
      .then(([cats, accs]) => {
        if (!alive) return;
        setCategories(
          cats
            .filter(
              (c) =>
                c.active !== false && (c.userId === null || c.userId === userId)
            )
            .map((c) => ({
              id: c.id,
              name: c.name,
              kind: c.kind === 'INCOME' ? 'INCOME' : 'EXPENSE',
            }))
        );
        setAccounts(
          accs
            .filter((a) => a.active)
            .map((a) => ({
              id: a.id,
              name: a.name,
              currencyCode: a.currencyCode,
            }))
        );
      })
      .catch((error) =>
        logger.warn('[AI Chat] Could not load categories/accounts', error)
      );
    return () => {
      alive = false;
    };
  }, [repository, userId]);

  return useMemo<ChatActions>(
    () => ({
      reply,
      categories,
      accounts,
      undoTransaction: async (transactionId) => {
        await runFinancialMutation({
          userId,
          repository,
          domains: [...MONEY_DOMAINS],
          mutation: () => repository.transactions.delete(transactionId),
        });
      },
      changeCategory: async (transactionId, categoryId) => {
        await runFinancialMutation({
          userId,
          repository,
          domains: [...MONEY_DOMAINS],
          mutation: () =>
            repository.transactions.update(transactionId, {
              id: transactionId,
              categoryId,
            }),
        });
      },
      scanReceipt: async (file) => {
        const image = await compressImage(file);
        const response = await fetch('/api/ai/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        });
        const body = (await response.json()) as ScanReceiptResponse;
        if (!response.ok || !body.success || !body.data) {
          throw new Error(body.error ?? 'No se pudo leer el ticket');
        }
        return body.data;
      },
      settlePendingReceipt: async (pendingId, transaction) => {
        const created = await runFinancialMutation({
          userId,
          repository,
          domains: [...MONEY_DOMAINS],
          mutation: () => repository.transactions.create(transaction),
        });
        await repository.pendingItems.update(pendingId, {
          done: true,
          convertedTransactionId: created.id,
        });
      },
    }),
    [reply, categories, accounts, repository, userId]
  );
}
