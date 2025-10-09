/**
 * LemonSqueezy Webhooks
 * 
 * Los webhooks de LemonSqueezy son más simples que Stripe:
 * - Un solo endpoint para todos los eventos
 * - Verificación con HMAC signature
 * - Eventos claros y directos
 */

import crypto from 'crypto';
import { lemonSqueezyConfig } from './config';
import { supabase } from '@/repositories/supabase/client';

/**
 * Verifica la firma del webhook de LemonSqueezy
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const hmac = crypto.createHmac('sha256', lemonSqueezyConfig.webhookSecret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

/**
 * Tipos de eventos de LemonSqueezy
 */
export type LemonSqueezyEvent =
  | 'order_created'
  | 'order_refunded'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'subscription_payment_recovered'
  | 'license_key_created';

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: LemonSqueezyEvent;
    custom_data?: {
      user_id?: string;
      [key: string]: any;
    };
  };
  data: {
    type: string;
    id: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id?: number;
      order_number?: number;
      product_id: number;
      variant_id: number;
      product_name: string;
      variant_name: string;
      user_name: string;
      user_email: string;
      status: string;
      status_formatted: string;
      card_brand?: string;
      card_last_four?: string;
      pause?: any;
      cancelled: boolean;
      trial_ends_at?: string;
      billing_anchor?: number;
      first_subscription_item?: {
        id: number;
        subscription_id: number;
        price_id: number;
        quantity: number;
      };
      urls: {
        update_payment_method: string;
        customer_portal: string;
      };
      renews_at?: string;
      ends_at?: string;
      created_at: string;
      updated_at: string;
      test_mode: boolean;
    };
  };
}

/**
 * Procesa los webhooks de LemonSqueezy
 */
export async function handleLemonSqueezyWebhook(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { meta, data } = payload;
  const { event_name, custom_data } = meta;
  const { attributes } = data;
  
  console.log(`[LemonSqueezy Webhook] Event: ${event_name}`);
  
  // Extraer user_id del custom_data
  const userId = custom_data?.user_id;
  
  if (!userId) {
    console.warn('[LemonSqueezy Webhook] No user_id in custom_data');
    return;
  }
  
  // Determinar el tier basado en el producto
  const tier = determineTier(attributes.variant_name, attributes.product_name);
  
  switch (event_name) {
    case 'subscription_created':
    case 'subscription_payment_success':
      await handleSubscriptionActivated(userId, data.id, attributes, tier);
      break;
      
    case 'subscription_updated':
      await handleSubscriptionUpdated(userId, data.id, attributes, tier);
      break;
      
    case 'subscription_cancelled':
    case 'subscription_expired':
      await handleSubscriptionCancelled(userId, attributes);
      break;
      
    case 'subscription_paused':
      await handleSubscriptionPaused(userId, attributes);
      break;
      
    case 'subscription_resumed':
    case 'subscription_unpaused':
      await handleSubscriptionResumed(userId, data.id, attributes, tier);
      break;
      
    case 'subscription_payment_failed':
      await handlePaymentFailed(userId, attributes);
      break;
      
    case 'order_created':
      // Para compras de una sola vez (si las tienes)
      console.log('[LemonSqueezy] Order created:', attributes.order_number);
      break;
      
    default:
      console.log(`[LemonSqueezy] Unhandled event: ${event_name}`);
  }
}

/**
 * Determina el tier basado en el nombre del producto/variante
 */
function determineTier(variantName: string, productName: string): 'base' | 'premium' {
  const name = `${variantName} ${productName}`.toLowerCase();
  
  if (name.includes('premium')) return 'premium';
  if (name.includes('base')) return 'base';
  
  // Default a base si no se puede determinar
  return 'base';
}

/**
 * Maneja la activación de una suscripción
 */
async function handleSubscriptionActivated(
  userId: string,
  subscriptionId: string,
  attributes: any,
  tier: 'base' | 'premium'
): Promise<void> {
  console.log(`[LemonSqueezy] Activating subscription for user ${userId}`);
  
  // Actualizar usuario
  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      subscription_started_at: new Date().toISOString(),
    })
    .eq('id', userId);
  
  // Crear o actualizar subscription
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      tier,
      status: 'active',
      lemonsqueezy_subscription_id: subscriptionId,
      lemonsqueezy_customer_id: attributes.customer_id.toString(),
      current_period_start: attributes.created_at,
      current_period_end: attributes.renews_at,
      cancel_at_period_end: attributes.cancelled,
      updated_at: new Date().toISOString(),
    });
  
  console.log(`[LemonSqueezy] Subscription activated for user ${userId}`);
}

/**
 * Maneja la actualización de una suscripción
 */
async function handleSubscriptionUpdated(
  userId: string,
  subscriptionId: string,
  attributes: any,
  tier: 'base' | 'premium'
): Promise<void> {
  console.log(`[LemonSqueezy] Updating subscription for user ${userId}`);
  
  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
    })
    .eq('id', userId);
  
  await supabase
    .from('subscriptions')
    .update({
      tier,
      status: 'active',
      current_period_end: attributes.renews_at,
      cancel_at_period_end: attributes.cancelled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Maneja la cancelación de una suscripción
 */
async function handleSubscriptionCancelled(
  userId: string,
  attributes: any
): Promise<void> {
  console.log(`[LemonSqueezy] Cancelling subscription for user ${userId}`);
  
  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
    })
    .eq('id', userId);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Maneja el pausado de una suscripción
 */
async function handleSubscriptionPaused(
  userId: string,
  attributes: any
): Promise<void> {
  console.log(`[LemonSqueezy] Pausing subscription for user ${userId}`);
  
  await supabase
    .from('users')
    .update({
      subscription_status: 'paused',
    })
    .eq('id', userId);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Maneja la reanudación de una suscripción
 */
async function handleSubscriptionResumed(
  userId: string,
  subscriptionId: string,
  attributes: any,
  tier: 'base' | 'premium'
): Promise<void> {
  console.log(`[LemonSqueezy] Resuming subscription for user ${userId}`);
  
  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
    })
    .eq('id', userId);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Maneja fallo de pago
 */
async function handlePaymentFailed(
  userId: string,
  attributes: any
): Promise<void> {
  console.log(`[LemonSqueezy] Payment failed for user ${userId}`);
  
  await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', userId);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}


