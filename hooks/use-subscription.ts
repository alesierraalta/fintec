import { useCallback, useContext, useLayoutEffect, useRef } from 'react';
import { SubscriptionContext } from '@/providers/subscription-provider';
import { SubscriptionStatusPayload } from '@/types/subscription';

export function useSubscription(
  initialPayload?: SubscriptionStatusPayload | null
) {
  const ctx = useContext(SubscriptionContext);

  if (!ctx) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider'
    );
  }

  const hydratedRef = useRef(false);

  // Seed shared state from an SSR-provided payload exactly once per mount,
  // synchronously before paint, so consumers that pass `initialPayload`
  // never observe a `loading: true` flash.
  useLayoutEffect(() => {
    if (initialPayload && !hydratedRef.current) {
      hydratedRef.current = true;
      ctx.hydrate(initialPayload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ctx;
}

/**
 * Hook to initiate upgrade to a specific tier
 */
export function useUpgrade() {
  const upgrade = useCallback(async (_tier: 'base' | 'premium') => {
    // Checkout is currently disabled.
    alert('Please contact support to upgrade your plan.');
    return null;
  }, []);

  return {
    upgrade,
    loading: false,
    error: null as string | null,
  };
}

/**
 * Hook to manage subscription
 */
export function useManageSubscription() {
  const openPortal = useCallback(async () => {
    // Portal is currently disabled.
    alert('Please contact support to manage your subscription.');
  }, []);

  return {
    openPortal,
    loading: false,
    error: null as string | null,
  };
}
