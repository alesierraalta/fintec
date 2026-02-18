import { createClient } from '@/lib/supabase/server';
import { createServerSubscriptionsRepository } from '@/repositories/factory';
import { SubscriptionTier, SubscriptionStatus } from '@/types/subscription';

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
  return {
    transactionCount: 0,
    backupCount: 0,
    exportCount: 0,
    apiCalls: 0,
    aiRequests: 0,
  };
}

export async function incrementUsage(userId: string, resource: string) {
  return Promise.resolve();
}
