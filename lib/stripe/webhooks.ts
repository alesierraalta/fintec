import Stripe from 'stripe';
import { stripe, stripeConfig } from './config';
import { supabase } from '@/repositories/supabase/client';
import { SubscriptionTier } from '@/types/subscription';

/**
 * Verifies and constructs a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    stripeConfig.webhookSecret
  );
}

/**
 * Handles checkout.session.completed event
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId || session.client_reference_id;
  const tier = session.metadata?.tier as SubscriptionTier;
  
  if (!userId || !tier) {
    console.error('Missing userId or tier in checkout session metadata');
    return;
  }

  const subscription = session.subscription as Stripe.Subscription;
  const customerId = session.customer as string;

  // Update user's subscription information
  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: typeof subscription === 'string' ? subscription : subscription?.id,
      subscription_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Create subscription record
  const subscriptionData = typeof subscription === 'string' 
    ? await stripe.subscriptions.retrieve(subscription)
    : subscription;

  // Note: Using type assertion for Stripe API compatibility
  const subData = subscriptionData as any;
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      tier,
      status: 'active',
      stripe_subscription_id: subscriptionData.id,
      stripe_customer_id: customerId,
      current_period_start: subData.current_period_start 
        ? new Date(subData.current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: subData.current_period_end 
        ? new Date(subData.current_period_end * 1000).toISOString()
        : new Date().toISOString(),
      cancel_at_period_end: subData.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    });

  console.log(`✅ Checkout completed for user ${userId} - tier: ${tier}`);
}

/**
 * Handles customer.subscription.updated event
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier as SubscriptionTier;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  const status = subscription.status === 'active' ? 'active'
    : subscription.status === 'past_due' ? 'past_due'
    : subscription.status === 'canceled' ? 'cancelled'
    : subscription.status === 'trialing' ? 'trialing'
    : 'paused';

  // Update user
  await supabase
    .from('users')
    .update({
      subscription_tier: tier || 'free',
      subscription_status: status,
      subscription_expires_at: subscription.cancel_at 
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Update subscription record
  // Note: Using type assertion for Stripe API compatibility
  const sub = subscription as any;
  await supabase
    .from('subscriptions')
    .update({
      tier: tier || 'free',
      status,
      current_period_start: sub.current_period_start 
        ? new Date(sub.current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: sub.current_period_end 
        ? new Date(sub.current_period_end * 1000).toISOString()
        : new Date().toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end || false,
      cancelled_at: sub.canceled_at 
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`✅ Subscription updated for user ${userId} - status: ${status}`);
}

/**
 * Handles customer.subscription.deleted event
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // Downgrade to free tier
  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      subscription_expires_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Update subscription record
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`✅ Subscription cancelled for user ${userId} - downgraded to free`);
}

/**
 * Handles invoice.payment_failed event
 */
export async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  // Note: Using type assertion for Stripe API compatibility
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;
  
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  // Update subscription status to past_due
  await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  console.log(`⚠️ Payment failed for user ${userId}`);
}

/**
 * Handles invoice.payment_succeeded event
 */
export async function handlePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  // Note: Using type assertion for Stripe API compatibility
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;
  
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  // Ensure subscription is active
  await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  console.log(`✅ Payment succeeded for user ${userId}`);
}

/**
 * Main webhook handler - routes events to specific handlers
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    throw error;
  }
}

