/**
 * Lemon Squeezy Subscription Management
 * 
 * This module provides subscription management functionality using Lemon Squeezy.
 */

import { supabase } from '@/repositories/supabase/client';
import { SubscriptionTier, UsageTracking } from '@/types/subscription';

/**
 * Get the current subscription tier for a user
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return 'free';
  }

  return data.tier as SubscriptionTier;
}

/**
 * Get current month's usage for a user
 */
export async function getUserUsage(userId: string): Promise<UsageTracking | null> {
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();

  if (error || !data) {
    return null;
  }

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
 * Increment usage for a specific resource
 */
export async function incrementUsage(
  userId: string,
  resource: 'transactionCount' | 'backupCount' | 'exportCount' | 'apiCalls' | 'aiRequests'
): Promise<void> {
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Map resource names to database column names
  const columnMap = {
    transactionCount: 'transaction_count',
    backupCount: 'backup_count',
    exportCount: 'export_count',
    apiCalls: 'api_calls',
    aiRequests: 'ai_requests',
  };

  const column = columnMap[resource];

  // Try to increment existing record
  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('id')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();

  if (existing) {
    // Increment existing record
    await supabase
      .from('usage_tracking')
      .update({
        [column]: supabase.rpc('increment', { x: 1 }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        month_year: monthYear,
        [column]: 1,
        transaction_count: resource === 'transactionCount' ? 1 : 0,
        backup_count: resource === 'backupCount' ? 1 : 0,
        export_count: resource === 'exportCount' ? 1 : 0,
        api_calls: resource === 'apiCalls' ? 1 : 0,
        ai_requests: resource === 'aiRequests' ? 1 : 0,
      });
  }
}

/**
 * Get subscription by user ID
 */
export async function getSubscriptionByUserId(userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    tier: data.tier as SubscriptionTier,
    status: data.status,
    lemonSqueezySubscriptionId: data.lemonsqueezy_subscription_id,
    lemonSqueezyCustomerId: data.lemonsqueezy_customer_id,
    lemonSqueezyOrderId: data.lemonsqueezy_order_id,
    customerPortalUrl: data.customer_portal_url,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    cancelledAt: data.cancelled_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Create or update subscription from Lemon Squeezy webhook
 */
export async function upsertSubscription(subscriptionData: {
  userId: string;
  tier: SubscriptionTier;
  status: string;
  lemonSqueezySubscriptionId?: string;
  lemonSqueezyCustomerId?: string;
  lemonSqueezyOrderId?: string;
  customerPortalUrl?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', subscriptionData.userId)
    .single();

  if (existing) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        lemonsqueezy_subscription_id: subscriptionData.lemonSqueezySubscriptionId,
        lemonsqueezy_customer_id: subscriptionData.lemonSqueezyCustomerId,
        lemonsqueezy_order_id: subscriptionData.lemonSqueezyOrderId,
        customer_portal_url: subscriptionData.customerPortalUrl,
        current_period_start: subscriptionData.currentPeriodStart,
        current_period_end: subscriptionData.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('[LemonSqueezy] Error updating subscription:', error);
      throw error;
    }
  } else {
    // Create new subscription
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: subscriptionData.userId,
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        lemonsqueezy_subscription_id: subscriptionData.lemonSqueezySubscriptionId,
        lemonsqueezy_customer_id: subscriptionData.lemonSqueezyCustomerId,
        lemonsqueezy_order_id: subscriptionData.lemonSqueezyOrderId,
        customer_portal_url: subscriptionData.customerPortalUrl,
        current_period_start: subscriptionData.currentPeriodStart,
        current_period_end: subscriptionData.currentPeriodEnd,
        cancel_at_period_end: false,
      });

    if (error) {
      console.error('[LemonSqueezy] Error creating subscription:', error);
      throw error;
    }
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId: string) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[LemonSqueezy] Error canceling subscription:', error);
    throw error;
  }
}

