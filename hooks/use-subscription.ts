import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = useCallback(async (tier: 'base' | 'premium') => {
    if (!user?.id) {
      setError('User not authenticated');
      // Redirect to login with return URL
      router.push(`/auth/login?returnTo=/checkout?tier=${tier}`);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Redirect to checkout page instead of calling API directly
      router.push(`/checkout?tier=${tier}`);
      return null;
    } catch (error: any) {
      setError(error.message || 'Failed to initiate upgrade');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, router]);

  return {
    upgrade,
    loading,
    error,
  };
}

/**
 * Hook to manage subscription (access Lemon Squeezy customer portal)
 * 
 * With Lemon Squeezy, customers can manage their subscriptions directly
 * through the Lemon Squeezy dashboard. The customer portal URL can be
 * found in the subscription data or accessed directly via Lemon Squeezy.
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
      // Get the subscription data to find the customer portal URL
      const response = await fetch(`/api/subscription/status?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription data');
      }

      const { subscription } = await response.json();
      
      if (subscription?.customerPortalUrl) {
        window.location.href = subscription.customerPortalUrl;
      } else {
        // Fallback: redirect to Lemon Squeezy general portal
        window.open('https://app.lemonsqueezy.com/my-orders', '_blank');
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

