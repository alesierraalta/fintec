/**
 * LemonSqueezy Checkout
 * 
 * Con LemonSqueezy, el checkout es MUCHO más simple:
 * - No necesitas crear sesiones server-side
 * - Solo generas una URL con los parámetros del checkout
 * - El usuario es redirigido directamente a LemonSqueezy
 */

import { lemonSqueezyConfig } from './config';

export interface CheckoutOptions {
  variantId: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
  customData?: Record<string, any>;
}

/**
 * Genera la URL de checkout de LemonSqueezy
 * Esta es la forma más simple - solo necesitas la URL
 */
export function getCheckoutUrl(options: CheckoutOptions): string {
  const { variantId, userEmail, userName, userId, customData } = options;
  
  // URL base del checkout
  const baseUrl = `https://${lemonSqueezyConfig.storeId}.lemonsqueezy.com/checkout/buy/${variantId}`;
  
  // Parámetros opcionales
  const params = new URLSearchParams();
  
  if (userEmail) {
    params.append('checkout[email]', userEmail);
  }
  
  if (userName) {
    params.append('checkout[name]', userName);
  }
  
  // Custom data para identificar al usuario en webhooks
  if (userId || customData) {
    const data = { userId, ...customData };
    params.append('checkout[custom][user_data]', JSON.stringify(data));
  }
  
  // Discount code (si lo tienes)
  // params.append('checkout[discount_code]', 'CODIGO');
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Obtiene la URL de checkout para el plan Base
 */
export function getBaseCheckoutUrl(userEmail?: string, userId?: string): string {
  return getCheckoutUrl({
    variantId: lemonSqueezyConfig.variants.base,
    userEmail,
    userId,
  });
}

/**
 * Obtiene la URL de checkout para el plan Premium
 */
export function getPremiumCheckoutUrl(userEmail?: string, userId?: string): string {
  return getCheckoutUrl({
    variantId: lemonSqueezyConfig.variants.premium,
    userEmail,
    userId,
  });
}

/**
 * Crea un checkout usando la API de LemonSqueezy
 * (Método alternativo si quieres más control)
 */
export async function createCheckout(options: CheckoutOptions) {
  const { variantId, userEmail, userName, userId, customData } = options;
  
  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${lemonSqueezyConfig.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            name: userName,
            custom: {
              user_id: userId,
              ...customData,
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: lemonSqueezyConfig.storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`LemonSqueezy API error: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return data.data.attributes.url;
}


