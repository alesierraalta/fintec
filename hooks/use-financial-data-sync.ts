'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
// Auth is supplied by the page so this low-level subscription has no hidden context dependency.
import {
  subscribeFinancialData,
  type FinancialDataDomain,
  type FinancialDataEvent,
} from '@/lib/finance/financial-data-sync';

export type FinancialDataSyncCallback = (
  event: FinancialDataEvent,
) => void | Promise<void>;

/** Subscribes pages to completed authoritative financial refreshes. */
export function useFinancialDataSync(
  userId: string | null | undefined,
  callback?: FinancialDataSyncCallback,
  domains?: FinancialDataDomain[],
): number {
  const [version, setVersion] = useState(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const domainKey = useMemo(() => domains?.join(',') ?? '', [domains]);

  useEffect(() => {
    if (!userId) return undefined;
    const subscribedDomains = domains ? new Set(domains) : null;
    return subscribeFinancialData(userId, async (event) => {
      if (
        subscribedDomains &&
        !event.domains.some((domain) => subscribedDomains.has(domain))
      ) {
        return;
      }
      setVersion((current) => current + 1);
      await callbackRef.current?.(event);
    });
    // domainKey intentionally represents array contents, not its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, domainKey]);

  return version;
}
