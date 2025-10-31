/**
 * Paddle Configuration
 * 
 * Paddle Billing provides a unified API for payments, subscriptions, and billing.
 * - Uses Paddle.js for client-side checkout
 * - Server-side API for webhooks and subscription management
 * - Merchant of Record handling taxes and compliance
 */

import { Paddle } from '@paddle/paddle-node-sdk';

// Initialize Paddle client
export const paddleClient = new Paddle(
  process.env.PADDLE_API_KEY || '',
  {
    environment: process.env.PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
  }
);

export const paddleConfig = {
  // API Key de Paddle (obtener de Developer Settings → API Keys)
  apiKey: process.env.PADDLE_API_KEY || '',
  
  // Webhook Secret (para verificar webhooks)
  webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
  
  // Environment (sandbox or production)
  environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
  
  // Product IDs (crear en Paddle Dashboard → Products)
  // Plan Full: pro_01k8x6ja17xqv32ac3qjtp4xw3
  // Premium IA: pro_01k8x6n2qj1dvf4t1jrfewbfjm
  products: {
    base: process.env.PADDLE_PRODUCT_ID_BASE || 'pro_01k8x6ja17xqv32ac3qjtp4xw3',
    premium: process.env.PADDLE_PRODUCT_ID_PREMIUM || 'pro_01k8x6n2qj1dvf4t1jrfewbfjm',
  },
  
  // Price IDs (precios de los productos - crear en Paddle Dashboard)
  // Plan Full: pri_01k8x7fz95gfheftb3tqg704ck
  // Premium IA: pri_01k8x7efr9tafdgdfeyj72xx6c
  prices: {
    base: process.env.PADDLE_PRICE_ID_BASE || 'pri_01k8x7fz95gfheftb3tqg704ck',
    premium: process.env.PADDLE_PRICE_ID_PREMIUM || 'pri_01k8x7efr9tafdgdfeyj72xx6c',
  },
  
  // URLs for redirects
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
export function validatePaddleConfig(): boolean {
  const required = [
    paddleConfig.apiKey,
    paddleConfig.webhookSecret,
  ];
  
  return required.every(key => key && key.length > 0);
}

/**
 * Get Paddle API headers for requests
 */
export function getPaddleHeaders() {
  return {
    'Authorization': `Bearer ${paddleConfig.apiKey}`,
    'Content-Type': 'application/json',
  };
}

