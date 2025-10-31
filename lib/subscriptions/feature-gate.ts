import { SubscriptionTier, Feature, TIER_LIMITS, FEATURE_ACCESS } from '@/types/subscription';
import { getUserTier, getUserUsage, incrementUsage } from '@/lib/paddle/subscriptions';
import { hasFeatureAccess, isWithinLimit } from './limits';

export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: 'base' | 'premium';
}

/**
 * Checks if a user has access to a feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: Feature
): Promise<FeatureCheckResult> {
  const tier = await getUserTier(userId);
  
  if (hasFeatureAccess(tier, feature)) {
    return { allowed: true };
  }

  // Determine which tier is required
  const requiresPremium = FEATURE_ACCESS.premium.includes(feature) && 
    !FEATURE_ACCESS.base.includes(feature);
  
  return {
    allowed: false,
    reason: `Esta función requiere una suscripción ${requiresPremium ? 'Premium' : 'Base'}`,
    upgradeRequired: requiresPremium ? 'premium' : 'base',
  };
}

/**
 * Checks if user can perform an action based on usage limits
 */
export async function checkUsageLimit(
  userId: string,
  resource: 'transactions' | 'backups' | 'exports' | 'apiCalls' | 'aiRequests'
): Promise<FeatureCheckResult> {
  const tier = await getUserTier(userId);
  const usage = await getUserUsage(userId);
  
  if (!usage) {
    // If no usage record exists, allow (it will be created)
    return { allowed: true };
  }

  // Map resource to usage field
  const usageMap = {
    transactions: usage.transactionCount,
    backups: usage.backupCount,
    exports: usage.exportCount,
    apiCalls: usage.apiCalls,
    aiRequests: usage.aiRequests,
  };

  // Map resource to limit field
  const limitMap = {
    transactions: TIER_LIMITS[tier].transactions,
    backups: TIER_LIMITS[tier].backups,
    exports: TIER_LIMITS[tier].exports,
    apiCalls: TIER_LIMITS[tier].apiCalls,
    aiRequests: TIER_LIMITS[tier].aiRequests,
  };

  const current = usageMap[resource];
  const limit = limitMap[resource];

  if (isWithinLimit(current, limit)) {
    return { allowed: true };
  }

  // Determine upgrade tier needed
  let upgradeRequired: 'base' | 'premium' = 'base';
  if (tier === 'free') {
    upgradeRequired = 'base';
  } else if (tier === 'base' && (resource === 'apiCalls' || resource === 'aiRequests')) {
    upgradeRequired = 'premium';
  }

  const resourceNames = {
    transactions: 'transacciones',
    backups: 'respaldos',
    exports: 'exportaciones',
    apiCalls: 'llamadas a API',
    aiRequests: 'solicitudes de IA',
  };

  return {
    allowed: false,
    reason: `Has alcanzado tu límite mensual de ${resourceNames[resource]} (${limit})`,
    upgradeRequired,
  };
}

/**
 * Attempts to use a resource, checking limits first
 */
export async function useResource(
  userId: string,
  resource: 'transactionCount' | 'backupCount' | 'exportCount' | 'apiCalls' | 'aiRequests'
): Promise<FeatureCheckResult> {
  // Map to the correct resource name for checkUsageLimit
  const resourceMap = {
    transactionCount: 'transactions' as const,
    backupCount: 'backups' as const,
    exportCount: 'exports' as const,
    apiCalls: 'apiCalls' as const,
    aiRequests: 'aiRequests' as const,
  };

  const check = await checkUsageLimit(userId, resourceMap[resource]);
  
  if (check.allowed) {
    // Increment usage
    await incrementUsage(userId, resource);
  }

  return check;
}

/**
 * Checks if user can create a transaction
 */
export async function canCreateTransaction(userId: string): Promise<FeatureCheckResult> {
  return await checkUsageLimit(userId, 'transactions');
}

/**
 * Checks if user can create a backup
 */
export async function canCreateBackup(userId: string): Promise<FeatureCheckResult> {
  return await checkUsageLimit(userId, 'backups');
}

/**
 * Checks if user can export data
 */
export async function canExportData(userId: string): Promise<FeatureCheckResult> {
  return await checkFeatureAccess(userId, 'export_data');
}

/**
 * Checks if user can use AI features
 */
export async function canUseAI(userId: string): Promise<FeatureCheckResult> {
  const tier = await getUserTier(userId);
  
  if (tier !== 'premium') {
    return {
      allowed: false,
      reason: 'Las funciones de IA están disponibles solo en el plan Premium',
      upgradeRequired: 'premium',
    };
  }

  return await checkUsageLimit(userId, 'aiRequests');
}

/**
 * Server-side middleware to check feature access
 */
export function createFeatureGate(feature: Feature) {
  return async (userId: string): Promise<FeatureCheckResult> => {
    return await checkFeatureAccess(userId, feature);
  };
}

