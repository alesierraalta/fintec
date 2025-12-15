import { createClient } from '@/lib/supabase/server';
import { SubscriptionTier, SubscriptionStatus } from '@/types/subscription';

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('tier, subscription_tier')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`[getUserTier] Error fetching tier for user ${userId}:`, error.message, error.details);
      console.warn(`[getUserTier] Defaulting to 'free' due to DB error for user ${userId}`);
      return 'free';
    }

    if (!data) {
      console.warn(`[getUserTier] No user data found for ${userId}. Defaulting to 'free'.`);
      return 'free';
    }

    // Prioritize subscription_tier (legacy/Stripe) if it indicates a paid plan
    if (data.subscription_tier === 'premium' || data.subscription_tier === 'base') {
      return data.subscription_tier as SubscriptionTier;
    }

    return (data.tier as SubscriptionTier) || 'free';
  } catch (error: any) {
    console.error(`[getUserTier] Unexpected exception for user ${userId}:`, error);
    return 'free';
  }
}


export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`[getSubscriptionStatus] Error for user ${userId}:`, error.message);
      return 'active';
    }

    if (!data) {
      return 'active'; 
    }

    return (data.subscription_status as SubscriptionStatus) || 'active';
  } catch (error) {
    console.error(`[getSubscriptionStatus] Unexpected error for user ${userId}:`, error);
    return 'active';
  }
}

export async function getSubscriptionByUserId(userId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, tier, subscription_tier, subscription_status, subscription_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`[getSubscriptionByUserId] Error fetching subscription for user ${userId}:`, error.message);
      return null;
    }

    if (!data) {
      console.warn(`[getSubscriptionByUserId] No data found for user ${userId}`);
      return null;
    }

    // Determine effective tier
    let effectiveTier = (data.tier as SubscriptionTier) || 'free';
    if (data.subscription_tier === 'premium' || data.subscription_tier === 'base') {
      effectiveTier = data.subscription_tier as SubscriptionTier;
    }

    return {
      id: data.subscription_id || `sub_${userId}`,
      userId: userId,
      tier: effectiveTier,
      status: (data.subscription_status as SubscriptionStatus) || 'active',
      cancelAtPeriodEnd: false, 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(), 
    };
  } catch (error) {
    console.error(`[getSubscriptionByUserId] Unexpected error for user ${userId}:`, error);
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