import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { 
  SubscriptionTier, 
  Subscription, 
  UsageTracking,
  UsageStatus,
  Feature,
  FEATURE_ACCESS 
} from '@/types/subscription';

interface SubscriptionData {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  usage: UsageTracking | null;
  usageStatus: UsageStatus | null;
  loading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [data, setData] = useState<SubscriptionData>({
    subscription: null,
    tier: 'free',
    usage: null,
    usageStatus: null,
    loading: true,
    error: null,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`/api/subscription/status?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const result = await response.json();

      setData({
        subscription: result.subscription,
        tier: result.tier || 'free',
        usage: result.usage,
        usageStatus: result.usageStatus,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error loading subscription',
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasFeature = useCallback((feature: Feature): boolean => {
    return FEATURE_ACCESS[data.tier]?.includes(feature) || false;
  }, [data.tier]);

  const isApproachingLimit = useCallback((resource: keyof UsageStatus): boolean => {
    if (!data.usageStatus) return false;
    const status = data.usageStatus[resource];
    return status.percentage >= 80;
  }, [data.usageStatus]);

  const isAtLimit = useCallback((resource: keyof UsageStatus): boolean => {
    if (!data.usageStatus) return false;
    const status = data.usageStatus[resource];
    return status.percentage >= 100;
  }, [data.usageStatus]);

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = useCallback(async (tier: 'base' | 'premium') => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          tier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }

      return url;
    } catch (error: any) {
      setError(error.message || 'Failed to initiate upgrade');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    upgrade,
    loading,
    error,
  };
}

/**
 * Hook to manage subscription (access customer portal)
 */
export function useManageSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      setError(error.message || 'Failed to open customer portal');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    openPortal,
    loading,
    error,
  };
}

