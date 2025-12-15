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
  const { user, session } = useAuth();
  const [data, setData] = useState<SubscriptionData>({
    subscription: null,
    tier: 'free',
    usage: null,
    usageStatus: null,
    loading: true,
    error: null,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user?.id || !session?.access_token) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Add cache-busting to ensure fresh data
      const cacheBuster = `t=${Date.now()}`;
      const response = await fetch(`/api/subscription/status?userId=${user.id}&${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }


      const result = await response.json();

      // Log tier detection for debugging
      if (result.tier !== 'premium' && user?.email === 'alesierraalta@gmail.com') {
        console.warn('[useSubscription] Tier mismatch detected:', {
          userId: user.id,
          returnedTier: result.tier,
          subscription: result.subscription,
        });
      }

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
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);


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

  // Force refresh subscription data when component mounts (clear any stale cache)
  useEffect(() => {
    if (user?.id) {
      // Small delay to ensure auth is ready
      const timer = setTimeout(() => {
        fetchSubscription();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user?.id]); // Only depend on user.id, not fetchSubscription to avoid loops

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
    // Checkout is currently disabled.
    alert("Please contact support to upgrade your plan.");
    return null;
  }, []);

  return {
    upgrade,
    loading,
    error,
  };
}

/**
 * Hook to manage subscription
 */
export function useManageSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
    // Portal is currently disabled.
    alert("Please contact support to manage your subscription.");
  }, []);

  return {
    openPortal,
    loading,
    error,
  };
}


