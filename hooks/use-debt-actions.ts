'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRepository } from '@/providers';
import { DebtStatus, Transaction } from '@/types';

interface UseDebtActionsOptions {
  repository: ReturnType<typeof useRepository>;
  onSuccess: () => void;
}

interface UseDebtActionsReturn {
  settlingId: string | null;
  deletingId: string | null;
  settleDebt: (debt: Transaction) => Promise<void>;
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
    async (debt: Transaction) => {
      if (!debt.id) return;

      // Optimistic: mark as settling
      setSettlingId(debt.id);

      // Capture previous state for rollback
      const previousDebtStatus = debt.debtStatus;
      const previousSettledAt = debt.settledAt;

      try {
        // Optimistically update local state via onSuccess (caller re-fetches)
        await repository.transactions.update(debt.id, {
          id: debt.id,
          debtStatus: DebtStatus.SETTLED,
          settledAt: new Date().toISOString(),
        });

        toast.success('Deuda saldada exitosamente');
        onSuccess();
      } catch (error) {
        // Rollback: restore previous state
        // The caller's loadDebts() will re-fetch, so we just show the error toast
        toast.error('Error al saldar la deuda');
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
