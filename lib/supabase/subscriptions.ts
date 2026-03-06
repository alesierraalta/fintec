import { createClient } from '@/lib/supabase/server';
import { createServerSubscriptionsRepository } from '@/repositories/factory';
import {
  SubscriptionTier,
  SubscriptionStatus,
  TIER_LIMITS,
  UsageStatus,
  SubscriptionStatusPayload,
} from '@/types/subscription';
import {
  getOwnedAccountScope,
  hasOwnedAccounts,
} from '@/repositories/supabase/account-scope';

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const supabase = await createClient();
  const repository = createServerSubscriptionsRepository({ supabase });

  try {
    const data = await repository.getUserSubscriptionSnapshot(userId);

    if (!data) {
      console.warn(
        `[getUserTier] No user data found for ${userId}. Defaulting to 'free'.`
      );
      return 'free';
    }

    if (!data.tier && !data.subscriptionTier) {
      console.error(`[getUserTier] Missing tier data for user ${userId}`);
      console.warn(
        `[getUserTier] Defaulting to 'free' due to DB error for user ${userId}`
      );
      return 'free';
    }

    // Prioritize subscription_tier (legacy/Stripe) if it indicates a paid plan
    if (
      data.subscriptionTier === 'premium' ||
      data.subscriptionTier === 'base'
    ) {
      return data.subscriptionTier as SubscriptionTier;
    }

    return (data.tier as SubscriptionTier) || 'free';
  } catch (error: any) {
    console.error(
      `[getUserTier] Unexpected exception for user ${userId}:`,
      error
    );
    return 'free';
  }
}

export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const supabase = await createClient();
  const repository = createServerSubscriptionsRepository({ supabase });

  try {
    const data = await repository.getUserSubscriptionSnapshot(userId);

    if (!data) {
      return 'active';
    }

    return (data.subscriptionStatus as SubscriptionStatus) || 'active';
  } catch (error) {
    console.error(
      `[getSubscriptionStatus] Unexpected error for user ${userId}:`,
      error
    );
    return 'active';
  }
}

export async function getSubscriptionByUserId(userId: string) {
  const supabase = await createClient();
  const repository = createServerSubscriptionsRepository({ supabase });

  try {
    const data = await repository.getUserSubscriptionSnapshot(userId);

    if (!data) {
      console.warn(
        `[getSubscriptionByUserId] No data found for user ${userId}`
      );
      return null;
    }

    // Determine effective tier
    let effectiveTier = (data.tier as SubscriptionTier) || 'free';
    if (
      data.subscriptionTier === 'premium' ||
      data.subscriptionTier === 'base'
    ) {
      effectiveTier = data.subscriptionTier as SubscriptionTier;
    }

    return {
      id: data.subscriptionId || `sub_${userId}`,
      userId: userId,
      tier: effectiveTier,
      status: (data.subscriptionStatus as SubscriptionStatus) || 'active',
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      `[getSubscriptionByUserId] Unexpected error for user ${userId}:`,
      error
    );
    return null;
  }
}

export async function getUserUsage(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  try {
    const supabase = await createClient();

    const scope = await getOwnedAccountScope(supabase, userId);
    if (!hasOwnedAccounts(scope)) {
      return {
        transactionCount: 0,
        backupCount: 0,
        exportCount: 0,
        apiCalls: 0,
        aiRequests: 0,
      };
    }

    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('account_id', scope.accountIds)
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if (error) {
      throw error;
    }

    return {
      transactionCount: count || 0,
      backupCount: 0,
      exportCount: 0,
      apiCalls: 0,
      aiRequests: 0,
    };
  } catch (error) {
    console.error(
      `[getUserUsage] Failed to fetch usage for user ${userId}:`,
      error
    );
    return {
      transactionCount: 0,
      backupCount: 0,
      exportCount: 0,
      apiCalls: 0,
      aiRequests: 0,
    };
  }
}

export async function incrementUsage(userId: string, resource: string) {
  return Promise.resolve();
}

export async function getSubscriptionStatusPayload(
  userId: string
): Promise<SubscriptionStatusPayload> {
  const [subscription, usage] = await Promise.all([
    getSubscriptionByUserId(userId),
    getUserUsage(userId),
  ]);

  const tier: SubscriptionTier = subscription?.tier ?? 'free';
  const limits = TIER_LIMITS[tier];

  const usageStatus: UsageStatus = {
    transactions: {
      current: usage?.transactionCount || 0,
      limit: limits.transactions,
      percentage:
        limits.transactions === 'unlimited'
          ? 0
          : Math.round(
              ((usage?.transactionCount || 0) / limits.transactions) * 100
            ),
    },
    backups: {
      current: usage?.backupCount || 0,
      limit: limits.backups,
      percentage:
        limits.backups === 'unlimited'
          ? 0
          : Math.round(((usage?.backupCount || 0) / limits.backups) * 100),
    },
    exports: {
      current: usage?.exportCount || 0,
      limit: limits.exports,
      percentage:
        limits.exports === 'unlimited'
          ? 0
          : Math.round(((usage?.exportCount || 0) / limits.exports) * 100),
    },
    aiRequests: {
      current: usage?.aiRequests || 0,
      limit: limits.aiRequests,
      percentage:
        limits.aiRequests === 'unlimited'
          ? 0
          : Math.round(((usage?.aiRequests || 0) / limits.aiRequests) * 100),
    },
  };

  return {
    subscription,
    tier,
    usage,
    usageStatus,
    limits,
  };
}
