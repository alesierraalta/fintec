import Stripe from 'stripe';

// Initialize Stripe client lazily to avoid build-time errors
// The actual validation happens at runtime when stripe is used
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Runtime validation function - call this before using stripe
function ensureStripeConfigured() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
  }
}

// Stripe configuration
export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Price IDs (create these in Stripe Dashboard)
  prices: {
    base: process.env.STRIPE_PRICE_ID_BASE || '',
    premium: process.env.STRIPE_PRICE_ID_PREMIUM || '',
  },
  
  // Success/Cancel URLs
  urls: {
    success: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
      : '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
    cancel: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
      : '/pricing',
    customerPortal: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/subscription`
      : '/subscription',
  },
};

export function validateStripeConfig(): boolean {
  const required = [
    process.env.STRIPE_SECRET_KEY,
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    process.env.STRIPE_WEBHOOK_SECRET,
  ];
  
  return required.every(key => key && key.length > 0);
}

