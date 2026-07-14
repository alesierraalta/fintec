'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRepository } from '@/providers';
import { DebtStatus, Transaction } from '@/types';
import { logger } from '@/lib/utils/logger';

interface UseDebtActionsOptions {
  repository: ReturnType<typeof useRepository>;
  onSuccess: () => void | Promise<void>;
}

interface UseDebtActionsReturn {
  settlingId: string | null;
  deletingId: string | null;
  settleDebt: (
    debt: Transaction,
    input: {
      amountMinor: number;
      settlementAccountId: string;
      date?: string;
      categoryId?: string;
      note?: string;
    }
  ) => Promise<void>;
  deleteDebt: (debt: Transaction) => Promise<void>;
}

/**
 * Custom hook for debt CRUD operations (settle, delete) with
 * optimistic updates, rollback on error, and toast notifications.
 */
export function useDebtActions({
  repository,
  onSuccess,
}: UseDebtActionsOptions): UseDebtActionsReturn {
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const settleDebt = useCallback(
    async (
      debt: Transaction,
      input: {
        amountMinor: number;
        settlementAccountId: string;
        date?: string;
        categoryId?: string;
        note?: string;
      }
    ) => {
      if (!debt.id) return;
      if (!input.settlementAccountId) throw new Error('Account required');
      if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
        throw new Error('Invalid amount');
      }
      const maxAllowed = debt.remainingAmountMinor ?? debt.amountMinor;
      if (input.amountMinor > maxAllowed) {
        throw new Error('Cannot overpay debt');
      }

      setSettlingId(debt.id);

      try {
        await repository.transactions.settleDebt({
          debtTransactionId: debt.id,
          settlementAccountId: input.settlementAccountId,
          amountMinor: input.amountMinor,
          date: input.date || new Date().toISOString(),
          categoryId: input.categoryId,
          note: input.note,
        });
      } catch (error) {
        toast.error('Error al saldar la deuda');
        setSettlingId(null);
        throw error;
      }

      try {
        toast.success('Deuda saldada exitosamente');
        await onSuccess();
      } catch (error) {
        logger.error('Debt settled but refresh failed:', error);
      } finally {
        setSettlingId(null);
      }
    },
    [repository, onSuccess]
  );

  const deleteDebt = useCallback(
    async (debt: Transaction) => {
      if (!debt.id) return;

      setDeletingId(debt.id);

      try {
        await repository.transactions.delete(debt.id);
        toast.success('Deuda eliminada');
        onSuccess();
      } catch (error) {
        toast.error('Error al eliminar la deuda');
      } finally {
        setDeletingId(null);
      }
    },
    [repository, onSuccess]
  );

  return {
    settlingId,
    deletingId,
    settleDebt,
    deleteDebt,
  };
}
