'use client';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRepository } from '@/providers';
import { Transaction } from '@/types';
import { logger } from '@/lib/utils/logger';
import { runFinancialMutation } from '@/lib/finance/financial-data-sync';

interface UseDebtActionsOptions {
  repository: ReturnType<typeof useRepository>;
  onSuccess: () => void | Promise<void>;
  userId?: string;
}
interface UseDebtActionsReturn {
  settlingId: string | null;
  deletingId: string | null;
  settleDebt: (debt: Transaction, input: { amountMinor: number; settlementAccountId: string; date?: string; categoryId?: string; note?: string }) => Promise<void>;
  deleteDebt: (debt: Transaction) => Promise<void>;
}

export function useDebtActions({ repository, onSuccess, userId }: UseDebtActionsOptions): UseDebtActionsReturn {
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const settleDebt = useCallback(async (debt: Transaction, input: { amountMinor: number; settlementAccountId: string; date?: string; categoryId?: string; note?: string }) => {
    if (!debt.id) return;
    if (!input.settlementAccountId) throw new Error('Account required');
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Invalid amount');
    if (input.amountMinor > (debt.remainingAmountMinor ?? debt.amountMinor)) throw new Error('Cannot overpay debt');
    setSettlingId(debt.id);
    const mutation = () => repository.transactions.settleDebt({ debtTransactionId: debt.id!, settlementAccountId: input.settlementAccountId, amountMinor: input.amountMinor, date: input.date || new Date().toISOString(), categoryId: input.categoryId, note: input.note });
    try {
      await runFinancialMutation({ userId, repository, domains: ['transactions', 'accounts', 'budgets'], mutation });
      toast.success('Deuda saldada exitosamente');
      try {
        await onSuccess();
      } catch (refreshError) {
        logger.error('Debt settled but refresh failed:', refreshError);
      }
    } catch (error) {
      toast.error('Error al saldar la deuda');
      logger.error('Debt settlement failed:', error);
      throw error;
    } finally { setSettlingId(null); }
  }, [repository, onSuccess, userId]);
  const deleteDebt = useCallback(async (debt: Transaction) => {
    if (!debt.id) return;
    setDeletingId(debt.id);
    const mutation = () => repository.transactions.delete(debt.id!);
    try {
      await runFinancialMutation({ userId, repository, domains: ['transactions', 'accounts', 'budgets'], mutation });
      toast.success('Deuda eliminada');
      await onSuccess();
    } catch (error) {
      toast.error('Error al eliminar la deuda');
    } finally { setDeletingId(null); }
  }, [repository, onSuccess, userId]);
  return { settlingId, deletingId, settleDebt, deleteDebt };
}
