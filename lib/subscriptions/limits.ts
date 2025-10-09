import { SubscriptionTier, TIER_LIMITS, Feature, FEATURE_ACCESS } from '@/types/subscription';

/**
 * Checks if a tier has access to a feature
 */
export function hasFeatureAccess(tier: SubscriptionTier, feature: Feature): boolean {
  return FEATURE_ACCESS[tier].includes(feature);
}

/**
 * Gets the limit for a resource based on tier
 */
export function getLimit(
  tier: SubscriptionTier,
  resource: keyof typeof TIER_LIMITS[SubscriptionTier]
): number | 'unlimited' {
  return TIER_LIMITS[tier][resource];
}

/**
 * Checks if usage is within limits
 */
export function isWithinLimit(
  current: number,
  limit: number | 'unlimited'
): boolean {
  if (limit === 'unlimited') return true;
  return current < limit;
}

/**
 * Calculates usage percentage
 */
export function getUsagePercentage(
  current: number,
  limit: number | 'unlimited'
): number {
  if (limit === 'unlimited') return 0;
  return Math.round((current / limit) * 100);
}

/**
 * Checks if user is approaching limit (>80%)
 */
export function isApproachingLimit(
  current: number,
  limit: number | 'unlimited'
): boolean {
  if (limit === 'unlimited') return false;
  return getUsagePercentage(current, limit) >= 80;
}

/**
 * Gets tier upgrade suggestions based on current usage
 */
export function getUpgradeSuggestion(
  tier: SubscriptionTier,
  transactionCount: number
): {
  shouldUpgrade: boolean;
  reason?: string;
  suggestedTier?: 'base' | 'premium';
} {
  if (tier === 'premium') {
    return { shouldUpgrade: false };
  }

  if (tier === 'free') {
    const limit = TIER_LIMITS.free.transactions;
    if (limit !== 'unlimited' && transactionCount >= limit * 0.8) {
      return {
        shouldUpgrade: true,
        reason: 'Estás alcanzando tu límite de transacciones mensuales',
        suggestedTier: 'base',
      };
    }
  }

  if (tier === 'base') {
    return {
      shouldUpgrade: false,
    };
  }

  return { shouldUpgrade: false };
}

/**
 * Format limit for display
 */
export function formatLimit(limit: number | 'unlimited'): string {
  if (limit === 'unlimited') return 'Ilimitado';
  return limit.toLocaleString();
}

