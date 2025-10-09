import { stripe, stripeConfig } from './config';
import { SubscriptionTier } from '@/types/subscription';
import Stripe from 'stripe';

interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  tier: 'base' | 'premium';
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Creates a Stripe checkout session for a subscription
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  tier,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const priceId = tier === 'base' 
    ? stripeConfig.prices.base 
    : stripeConfig.prices.premium;

  if (!priceId) {
    throw new Error(`Price ID not configured for tier: ${tier}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    client_reference_id: userId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || stripeConfig.urls.success,
    cancel_url: cancelUrl || stripeConfig.urls.cancel,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return session;
}

/**
 * Creates a Stripe customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || stripeConfig.urls.customerPortal,
  });

  return session;
}

/**
 * Retrieves a checkout session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });

  return session;
}

/**
 * Retrieves a subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Cancels a subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Reactivates a cancelled subscription
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Updates a subscription to a new tier
 */
export async function updateSubscription(
  subscriptionId: string,
  newTier: 'base' | 'premium'
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const newPriceId = newTier === 'base' 
    ? stripeConfig.prices.base 
    : stripeConfig.prices.premium;

  if (!newPriceId) {
    throw new Error(`Price ID not configured for tier: ${newTier}`);
  }

  // Update the subscription with the new price
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      ...subscription.metadata,
      tier: newTier,
    },
  });
}

