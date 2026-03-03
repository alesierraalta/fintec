import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import {
  SubscriptionTier,
  Subscription,
  UsageTracking,
  UsageStatus,
  Feature,
  FEATURE_ACCESS,
  SubscriptionStatusPayload,
} from '@/types/subscription';

const SUBSCRIPTION_CACHE_TTL_MS = 30000;

const subscriptionCache = new Map<
  string,
  { data: SubscriptionStatusPayload; fetchedAt: number }
>();
const inFlightRequests = new Map<string, Promise<SubscriptionStatusPayload>>();

async function fetchSubscriptionStatus(
  userId: string,
  accessToken: string
): Promise<SubscriptionStatusPayload> {
  const cacheEntry = subscriptionCache.get(userId);
  if (
    cacheEntry &&
    Date.now() - cacheEntry.fetchedAt < SUBSCRIPTION_CACHE_TTL_MS
  ) {
    return cacheEntry.data;
  }

  const existingRequest = inFlightRequests.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const response = await fetch('/api/subscription/status', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    const result = (await response.json()) as SubscriptionStatusPayload;
    subscriptionCache.set(userId, { data: result, fetchedAt: Date.now() });
    return result;
  })();

  inFlightRequests.set(userId, request);

  try {
    return await request;
  } finally {
    inFlightRequests.delete(userId);
  }
}

function mapSubscriptionPayloadToData(
  payload: SubscriptionStatusPayload
): Omit<SubscriptionData, 'loading' | 'error'> {
  return {
    subscription: payload.subscription,
    tier: payload.tier || 'free',
    usage: payload.usage as UsageTracking | null,
    usageStatus: payload.usageStatus,
  };
}

interface SubscriptionData {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  usage: UsageTracking | null;
  usageStatus: UsageStatus | null;
  loading: boolean;
  error: string | null;
}

export function useSubscription(
  initialPayload?: SubscriptionStatusPayload | null
) {
  const { user, session } = useAuth();
  const initialDataWasUsedRef = useRef(Boolean(initialPayload));
  const [data, setData] = useState<SubscriptionData>(() => {
    if (initialPayload) {
      return {
        ...mapSubscriptionPayloadToData(initialPayload),
        loading: false,
        error: null,
      };
    }

    return {
      subscription: null,
      tier: 'free',
      usage: null,
      usageStatus: null,
      loading: true,
      error: null,
    };
  });

  const fetchSubscription = useCallback(async () => {
    if (!user?.id || !session?.access_token) {
      setData({
        subscription: null,
        tier: 'free',
        usage: null,
        usageStatus: null,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      setData((prev) => ({
        ...prev,
        loading: prev.subscription === null && prev.usageStatus === null,
        error: null,
      }));
      const result = await fetchSubscriptionStatus(
        user.id,
        session.access_token
      );

      // Log tier detection for debugging
      if (
        result.tier !== 'premium' &&
        user?.email === 'alesierraalta@gmail.com'
      ) {
        console.warn('[useSubscription] Tier mismatch detected:', {
          userId: user.id,
          returnedTier: result.tier,
          subscription: result.subscription,
        });
      }

      setData((prev) => ({
        ...prev,
        ...mapSubscriptionPayloadToData(result),
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Error loading subscription',
      }));
    }
  }, [user?.id, user?.email, session?.access_token]);

  useEffect(() => {
    if (initialDataWasUsedRef.current && user?.id) {
      initialDataWasUsedRef.current = false;
      return;
    }

    fetchSubscription();
  }, [fetchSubscription, user?.id]);

  // Refresh subscription on window focus (in case tier changed in another tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id) {
        fetchSubscription();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, fetchSubscription]);
  const hasFeature = useCallback(
    (feature: Feature): boolean => {
      return FEATURE_ACCESS[data.tier]?.includes(feature) || false;
    },
    [data.tier]
  );

  const isApproachingLimit = useCallback(
    (resource: keyof UsageStatus): boolean => {
      if (!data.usageStatus) return false;
      const status = data.usageStatus[resource];
      return status.percentage >= 80;
    },
    [data.usageStatus]
  );

  const isAtLimit = useCallback(
    (resource: keyof UsageStatus): boolean => {
      if (!data.usageStatus) return false;
      const status = data.usageStatus[resource];
      return status.percentage >= 100;
    },
    [data.usageStatus]
  );

  const canUpgrade = data.tier !== 'premium';
  const isPremium = data.tier === 'premium';
  const isBase = data.tier === 'base';
  const isFree = data.tier === 'free';

  return {
    ...data,
    hasFeature,
    isApproachingLimit,
    isAtLimit,
    canUpgrade,
    isPremium,
    isBase,
    isFree,
    refresh: fetchSubscription,
  };
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
