/**
 * Paddle Webhooks
 * 
 * Paddle webhooks use a different structure than LemonSqueezy:
 * - Events are nested in notification_type
 * - Signature verification uses Paddle's SDK
 * - Custom data is in metadata
 */

import crypto from 'crypto';
import { paddleConfig, paddleClient } from './config';
import { supabase } from '@/repositories/supabase/client';

/**
 * Verify Paddle webhook signature
 * Paddle uses HMAC SHA256 with the webhook secret
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!signature) {
    return false;
  }

  // Paddle sends signature in format: ts=<timestamp>;h1=<signature>
  const parts = signature.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts.ts;
  const h1 = parts.h1;

  if (!timestamp || !h1) {
    return false;
  }

  // Create signed payload: timestamp + '.' + raw body
  const signedPayload = `${timestamp}.${rawBody}`;
  
  // Compute HMAC
  const hmac = crypto.createHmac('sha256', paddleConfig.webhookSecret);
  const computedSignature = hmac.update(signedPayload).digest('hex');

  // Compare signatures using timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(h1),
    Buffer.from(computedSignature)
  );
}

/**
 * Paddle webhook event types
 */
export type PaddleWebhookEvent =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'transaction.completed'
  | 'transaction.payment_failed'
  | 'transaction.past_due';

/**
 * Paddle webhook payload structure
 */
export interface PaddleWebhookPayload {
  event_id: string;
  event_type: string;
  occurrence_id: string;
  occurred_at: string;
  notification_id?: string;
  data: {
    id: string;
    type: string;
    status?: string;
    customer_id?: string;
    subscription_id?: string;
    transaction_id?: string;
    items?: Array<{
      price_id: string;
      product_id: string;
      quantity: number;
    }>;
    custom_data?: {
      user_id?: string;
      [key: string]: any;
    };
    currency_code?: string;
    billing_details?: {
      enable_checkout?: boolean;
      purchase_order_number?: string;
      additional_information?: string;
      payment_terms?: string;
    };
    billing_period?: {
      starts_at: string;
      ends_at: string;
    };
    scheduled_change?: {
      action: string;
      effective_at: string;
      resume_at?: string;
    };
    created_at?: string;
    updated_at?: string;
    canceled_at?: string;
    paused_at?: string;
    resumed_at?: string;
  };
}

/**
 * Process Paddle webhook events
 */
export async function handlePaddleWebhook(
  payload: PaddleWebhookPayload
): Promise<void> {
  const { event_type, data } = payload;
  
  // Extract user_id from custom_data
  const userId = data.custom_data?.user_id;
  
  if (!userId) {
    console.warn('[Paddle Webhook] No user_id in custom_data, skipping');
    return;
  }

  // Determine tier from price_id or product_id
  const priceId = data.items?.[0]?.price_id;
  const tier = determineTierFromPriceId(priceId);

  switch (event_type) {
    case 'subscription.created':
    case 'transaction.completed':
      await handleSubscriptionActivated(userId, data, tier);
      break;
      
    case 'subscription.updated':
      await handleSubscriptionUpdated(userId, data, tier);
      break;
      
    case 'subscription.canceled':
      await handleSubscriptionCancelled(userId, data);
      break;
      
    case 'subscription.paused':
      await handleSubscriptionPaused(userId, data);
      break;
      
    case 'subscription.resumed':
      await handleSubscriptionResumed(userId, data, tier);
      break;
      
    case 'transaction.payment_failed':
    case 'transaction.past_due':
      await handlePaymentFailed(userId, data);
      break;
      
    default:
      console.log(`[Paddle Webhook] Unhandled event type: ${event_type}`);
  }
}

/**
 * Determine tier from Paddle price ID
 */
function determineTierFromPriceId(priceId?: string): 'base' | 'premium' {
  if (!priceId) {
    return 'base'; // Default
  }

  const { prices } = require('./config').paddleConfig;
  
  if (priceId === prices.premium) {
    return 'premium';
  }
  if (priceId === prices.base) {
    return 'base';
  }
  
  // Fallback: check if priceId contains "premium" or "base"
  const lowerPriceId = priceId.toLowerCase();
  if (lowerPriceId.includes('premium')) {
    return 'premium';
  }
  
  return 'base';
}

/**
 * Handle subscription activation (created or payment success)
 */
async function handleSubscriptionActivated(
  userId: string,
  data: PaddleWebhookPayload['data'],
  tier: 'base' | 'premium'
): Promise<void> {
  const subscriptionId = data.subscription_id || data.id;
  const customerId = data.customer_id;
  const transactionId = data.transaction_id;
  
  // Update user
  await (supabase.from('users') as any)
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      subscription_started_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Create or update subscription
  await (supabase.from('subscriptions') as any)
    .upsert({
      user_id: userId,
      tier,
      status: 'active',
      paddle_subscription_id: subscriptionId,
      paddle_customer_id: customerId,
      paddle_transaction_id: transactionId,
      current_period_start: data.billing_period?.starts_at || data.created_at,
      current_period_end: data.billing_period?.ends_at,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(
  userId: string,
  data: PaddleWebhookPayload['data'],
  tier: 'base' | 'premium'
): Promise<void> {
  await (supabase.from('users') as any)
    .update({
      subscription_tier: tier,
      subscription_status: data.status === 'active' ? 'active' : 'paused',
    })
    .eq('id', userId);

  await (supabase.from('subscriptions') as any)
    .update({
      tier,
      status: data.status || 'active',
      current_period_end: data.billing_period?.ends_at,
      cancel_at_period_end: data.scheduled_change?.action === 'cancel',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(
  userId: string,
  data: PaddleWebhookPayload['data']
): Promise<void> {
  await (supabase.from('users') as any)
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
    })
    .eq('id', userId);

  await (supabase.from('subscriptions') as any)
    .update({
      status: 'cancelled',
      cancelled_at: data.canceled_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Handle subscription pause
 */
async function handleSubscriptionPaused(
  userId: string,
  data: PaddleWebhookPayload['data']
): Promise<void> {
  await (supabase.from('users') as any)
    .update({
      subscription_status: 'paused',
    })
    .eq('id', userId);

  await (supabase.from('subscriptions') as any)
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Handle subscription resume
 */
async function handleSubscriptionResumed(
  userId: string,
  data: PaddleWebhookPayload['data'],
  tier: 'base' | 'premium'
): Promise<void> {
  await (supabase.from('users') as any)
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
    })
    .eq('id', userId);

  await (supabase.from('subscriptions') as any)
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(
  userId: string,
  data: PaddleWebhookPayload['data']
): Promise<void> {
  await (supabase.from('users') as any)
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', userId);

  await (supabase.from('subscriptions') as any)
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

