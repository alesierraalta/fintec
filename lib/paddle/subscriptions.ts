/**
 * Paddle Subscription Management
 * 
 * This module provides subscription management functionality using Paddle.
 */

import { supabase, createSupabaseServiceClient } from '@/repositories/supabase/client';
import { SubscriptionTier, UsageTracking } from '@/types/subscription';
import { logger } from '@/lib/utils/logger';

// Helper to get authenticated Supabase client
// Uses service role client for server-side operations (API routes)
function getSupabaseClient() {
  // In server-side context (API routes), use service role client to bypass RLS
  // In client-side context, use regular client with user session
  if (typeof window === 'undefined') {
    return createSupabaseServiceClient();
  }
  return supabase;
}

/**
 * Get the current subscription tier for a user
 * Uses subscriptions table as primary source, falls back to users.subscription_tier
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const client = getSupabaseClient();
  
  // Try subscriptions table first (preferred source of truth)
  const { data: subData, error: subError } = await client
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid throwing errors

  if (subData && (subData as any).tier) {
    return (subData as any).tier as SubscriptionTier;
  }

  // Fallback to users.subscription_tier if subscription record not found
  const { data: userData, error: userError } = await client
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle();

  if (userData && (userData as any).subscription_tier) {
    logger.warn(`getUserTier: Using users.subscription_tier as fallback for user ${userId}`);
    return (userData as any).subscription_tier as SubscriptionTier;
  }

  // Log errors for debugging
  if (subError) {
    logger.error('getUserTier: subscriptions query error', { userId, error: subError });
  }
  if (userError) {
    logger.error('getUserTier: users query error', { userId, error: userError });
  }

  return 'free';
}

/**
 * Get current month's usage for a user
 */
export async function getUserUsage(userId: string): Promise<UsageTracking | null> {
  const client = getSupabaseClient();
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await client
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .maybeSingle();

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

  const client = getSupabaseClient();
  
  // Try to increment existing record
  const { data: existing } = await client
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .maybeSingle();

  if (existing) {
    // Increment existing record
    const current = (existing as any)[column] || 0;
    await (client.from('usage_tracking') as any)
      .update({
        [column]: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as any).id);
  } else {
    // Create new record
    await (client.from('usage_tracking') as any)
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
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) // Get the most recent subscription
    .limit(1)
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors

  if (error || !data) {
    if (error) {
      logger.error('getSubscriptionByUserId: query error', { userId, error });
    }
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
  const client = getSupabaseClient();
  
  const { data: existing } = await client
    .from('subscriptions')
    .select('id')
    .eq('user_id', subscriptionData.userId)
    .maybeSingle();

  if (existing) {
    // Update existing subscription
    const { error } = await (client.from('subscriptions') as any)
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
    const { error } = await (client.from('subscriptions') as any)
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
  const client = getSupabaseClient();
  
  const { error } = await (client
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

