import { supabase } from '@/repositories/supabase/client';
import { Subscription, SubscriptionTier, UsageTracking } from '@/types/subscription';
import { getSubscription } from './checkout';

/**
 * Gets subscription for a user from database
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    tier: data.tier as SubscriptionTier,
    status: data.status,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripeCustomerId: data.stripe_customer_id,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    cancelledAt: data.cancelled_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Gets user's tier from database
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const { data, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (error || !data) return 'free';

  return data.subscription_tier as SubscriptionTier || 'free';
}

/**
 * Gets user's current month usage
 */
export async function getUserUsage(userId: string): Promise<UsageTracking | null> {
  const currentMonthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', currentMonthYear)
    .single();

  if (error || !data) {
    // Create initial usage record if it doesn't exist
    const { data: newData } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        month_year: currentMonthYear,
        transaction_count: 0,
        backup_count: 0,
        api_calls: 0,
        export_count: 0,
        ai_requests: 0,
      })
      .select()
      .single();

    if (!newData) return null;
    return mapUsageData(newData);
  }

  return mapUsageData(data);
}

function mapUsageData(data: any): UsageTracking {
  return {
    id: data.id,
    userId: data.user_id,
    monthYear: data.month_year,
    transactionCount: data.transaction_count,
    backupCount: data.backup_count,
    apiCalls: data.api_calls,
    exportCount: data.export_count,
    aiRequests: data.ai_requests,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Increments usage count for a resource
 */
export async function incrementUsage(
  userId: string,
  resource: keyof Omit<UsageTracking, 'id' | 'userId' | 'monthYear' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const currentMonthYear = new Date().toISOString().slice(0, 7);

  // Get or create usage record
  let usage = await getUserUsage(userId);
  
  if (!usage) {
    // Create if doesn't exist
    await supabase.from('usage_tracking').insert({
      user_id: userId,
      month_year: currentMonthYear,
      [resource]: 1,
    });
    return;
  }

  // Map camelCase to snake_case for database
  const dbField = resource.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  // Increment the specific resource
  await supabase
    .from('usage_tracking')
    .update({
      [dbField]: (usage[resource] as number) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('month_year', currentMonthYear);
}

/**
 * Syncs subscription from Stripe to database
 */
export async function syncSubscriptionFromStripe(
  userId: string,
  stripeSubscriptionId: string
): Promise<void> {
  const stripeSubscription = await getSubscription(stripeSubscriptionId);
  const tier = stripeSubscription.metadata?.tier as SubscriptionTier || 'free';

  // Update user
  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: stripeSubscription.status === 'active' ? 'active' : stripeSubscription.status,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Update subscription record
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      tier,
      status: stripeSubscription.status === 'active' ? 'active' : stripeSubscription.status,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer as string,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    });
}

/**
 * Resets monthly transaction count for all users
 * Should be called by a cron job at the start of each month
 */
export async function resetMonthlyUsage(): Promise<void> {
  // This is handled by the database function reset_transaction_count()
  // But we can also reset usage_tracking for the new month
  const { error } = await supabase.rpc('reset_transaction_count');
  
  if (error) {
    console.error('Error resetting monthly usage:', error);
  }
}

