/**
 * LemonSqueezy Configuration
 * 
 * LemonSqueezy es muy simple:
 * - No necesitas webhooks complejos
 * - No necesitas crear sesiones server-side
 * - Solo usas URLs de productos directamente
 * - Ellos manejan toda la facturación y impuestos (Merchant of Record)
 */

export const lemonSqueezyConfig = {
  // API Key de LemonSqueezy (obtener de Settings → API)
  apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
  
  // Store ID (obtener de tu dashboard)
  storeId: process.env.LEMONSQUEEZY_STORE_ID || '',
  
  // Webhook Secret (para verificar webhooks)
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
  
  // Product IDs (crear en LemonSqueezy Dashboard)
  products: {
    base: process.env.LEMONSQUEEZY_PRODUCT_ID_BASE || '',
    premium: process.env.LEMONSQUEEZY_PRODUCT_ID_PREMIUM || '',
  },
  
  // Variant IDs (precios de los productos)
  variants: {
    base: process.env.LEMONSQUEEZY_VARIANT_ID_BASE || '',
    premium: process.env.LEMONSQUEEZY_VARIANT_ID_PREMIUM || '',
  },
  
  // URLs
  urls: {
    success: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`
      : '/subscription/success',
    cancel: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
      : '/pricing',
  },
};

/**
 * Validar que la configuración esté completa
 */
export function validateLemonSqueezyConfig(): boolean {
  const required = [
    lemonSqueezyConfig.apiKey,
    lemonSqueezyConfig.storeId,
  ];
  
  return required.every(key => key && key.length > 0);
}

/**
 * Headers para las peticiones a LemonSqueezy API
 */
export function getLemonSqueezyHeaders() {
  return {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `Bearer ${lemonSqueezyConfig.apiKey}`,
  };
}


