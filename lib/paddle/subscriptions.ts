/**
 * Paddle Subscription Management
 * 
 * This module provides subscription management functionality using Paddle.
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

  return (data as any).tier as SubscriptionTier;
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

  const d: any = data as any;
  return {
    id: d.id,
    userId: d.user_id,
    monthYear: d.month_year,
    transactionCount: d.transaction_count,
    backupCount: d.backup_count,
    apiCalls: d.api_calls,
    exportCount: d.export_count,
    aiRequests: d.ai_requests,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
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
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single();

  if (existing) {
    // Increment existing record
    const current = (existing as any)[column] || 0;
    await (supabase.from('usage_tracking') as any)
      .update({
        [column]: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as any).id);
  } else {
    // Create new record
    await (supabase.from('usage_tracking') as any)
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

  const d: any = data as any;
  return {
    id: d.id,
    userId: d.user_id,
    tier: d.tier as SubscriptionTier,
    status: d.status,
    paddleSubscriptionId: d.paddle_subscription_id,
    paddleCustomerId: d.paddle_customer_id,
    paddleTransactionId: d.paddle_transaction_id,
    customerPortalUrl: d.customer_portal_url,
    currentPeriodStart: d.current_period_start,
    currentPeriodEnd: d.current_period_end,
    cancelAtPeriodEnd: d.cancel_at_period_end,
    cancelledAt: d.cancelled_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

/**
 * Create or update subscription from Paddle webhook
 */
export async function upsertSubscription(subscriptionData: {
  userId: string;
  tier: SubscriptionTier;
  status: string;
  paddleSubscriptionId?: string;
  paddleCustomerId?: string;
  paddleTransactionId?: string;
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
    const { error } = await (supabase.from('subscriptions') as any)
      .update({
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        paddle_subscription_id: subscriptionData.paddleSubscriptionId,
        paddle_customer_id: subscriptionData.paddleCustomerId,
        paddle_transaction_id: subscriptionData.paddleTransactionId,
        customer_portal_url: subscriptionData.customerPortalUrl,
        current_period_start: subscriptionData.currentPeriodStart,
        current_period_end: subscriptionData.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as any).id);

    if (error) {
      throw error;
    }
  } else {
    // Create new subscription
    const { error } = await (supabase.from('subscriptions') as any)
      .insert({
        user_id: subscriptionData.userId,
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        paddle_subscription_id: subscriptionData.paddleSubscriptionId,
        paddle_customer_id: subscriptionData.paddleCustomerId,
        paddle_transaction_id: subscriptionData.paddleTransactionId,
        customer_portal_url: subscriptionData.customerPortalUrl,
        current_period_start: subscriptionData.currentPeriodStart,
        current_period_end: subscriptionData.currentPeriodEnd,
        cancel_at_period_end: false,
      });

    if (error) {
      throw error;
    }
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId: string) {
  const { error } = await (supabase
    .from('subscriptions') as any)
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

