'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers';
import { getClientDBProvider } from '@/repositories/factory';
import { supabase } from '@/repositories/supabase/client';
import {
  cancelFinancialRealtimeRefresh,
  scheduleFinancialRealtimeRefresh,
} from '@/lib/finance/financial-data-sync';

type FinancialDomain = 'transactions' | 'accounts' | 'budgets';
const RESUBSCRIBE_DELAY = 1_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function FinancialRealtimeSync() {
  const { user } = useAuth();
  const repository = useRepository();

  useEffect(() => {
    if (!user?.id || getClientDBProvider() !== 'supabase') return undefined;
    const userId = user.id;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectAttempts = 0;
    let stopped = false;

    const refresh = (domains: FinancialDomain[]) => {
      scheduleFinancialRealtimeRefresh(repository, userId, domains);
    };
    const removeChannel = () => {
      if (!channel) return;
      const toRemove = channel;
      channel = undefined;
      void supabase.removeChannel(toRemove);
    };
    const connect = () => {
      if (stopped || channel) return;
      const instanceId = Math.random().toString(36).slice(2, 6);
      const nextChannel = supabase
        .channel(`financial-data:${userId}:${instanceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
            filter: `user_id=eq.${userId}`,
          },
          () => refresh(['accounts', 'transactions', 'budgets'])
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'budgets',
            filter: `user_id=eq.${userId}`,
          },
          () => refresh(['budgets', 'transactions'])
        )
        // Transactions are account-scoped; do not invent a transactions.user_id filter.
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
          },
          () => refresh(['transactions', 'accounts', 'budgets'])
        );
      channel = nextChannel;
      nextChannel.subscribe((status) => {
        if (stopped) return;
        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0;
          refresh(['transactions', 'accounts', 'budgets']);
        }
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          removeChannel();
          if (!retryTimer && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = RESUBSCRIBE_DELAY * 2 ** reconnectAttempts;
            reconnectAttempts += 1;
            retryTimer = setTimeout(() => {
              retryTimer = undefined;
              connect();
            }, delay);
          }
        }
      });
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      cancelFinancialRealtimeRefresh(userId);
      removeChannel();
    };
  }, [repository, user?.id]);

  return null;
}
