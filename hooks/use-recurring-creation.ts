'use client';

import { useCallback } from 'react';
import { supabase } from '@/repositories/supabase/client';
import {
  CreateRecurringTransactionDTO,
  RecurringTransaction,
} from '@/types/recurring-transactions';

export type RecurringCreationResult =
  | {
      status: 'rule-created';
      transaction: RecurringTransaction;
    }
  | {
      status: 'first-operation-created';
      transaction: RecurringTransaction;
      transactionId: string;
    }
  | {
      status: 'partial-failure';
      transaction: RecurringTransaction;
      /** Spanish corrective message from the route: the rule was retained,
       * the first operation was not registered, and how to retry. */
      error: string;
    };

/**
 * Focused orchestration hook for durable recurring creation.
 *
 * The rule is persisted BEFORE success is ever reported. The caller supplies
 * the explicit first-operation choice; the route persists the rule first,
 * then (optionally) registers the first operation and returns a
 * differentiated outcome. This hook maps that outcome to a typed result and
 * never lets a failed persistence pass as success.
 */
export function useRecurringCreation() {
  const createRecurring = useCallback(
    async (
      data: CreateRecurringTransactionDTO,
      registerFirstOperation: boolean
    ): Promise<RecurringCreationResult> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No autenticado');
      }

      const response = await fetch('/api/recurring-transactions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, registerFirstOperation }),
      });

      const result = await response.json();

      if (response.ok && result.outcome === 'rule-created') {
        return { status: 'rule-created', transaction: result.data };
      }

      if (response.ok && result.outcome === 'first-operation-created') {
        return {
          status: 'first-operation-created',
          transaction: result.data,
          transactionId: result.transactionId,
        };
      }

      // The rule was retained even when the first operation failed; surface
      // the partial state AND the route's corrective Spanish message so the
      // caller can offer a corrective action instead of silently claiming
      // full success.
      if (result.outcome === 'partial-failure') {
        return {
          status: 'partial-failure',
          transaction: result.data,
          error: result.error,
        };
      }

      throw new Error(result.error || 'No se pudo guardar la regla recurrente');
    },
    []
  );

  return { createRecurring };
}
