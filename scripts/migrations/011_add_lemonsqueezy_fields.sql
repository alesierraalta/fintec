-- Migration: Add LemonSqueezy fields
-- Description: Adds LemonSqueezy-specific fields to subscriptions table

-- Add LemonSqueezy fields to subscriptions table
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id VARCHAR(255);

-- Create indexes for LemonSqueezy fields
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_customer ON subscriptions(lemonsqueezy_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_subscription ON subscriptions(lemonsqueezy_subscription_id);

-- Drop Stripe-specific indexes (ya no los necesitamos)
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer;
DROP INDEX IF EXISTS idx_subscriptions_stripe_subscription;
DROP INDEX IF EXISTS idx_users_stripe_customer;

-- Update users table: remove Stripe fields, keep subscription fields
-- NO borramos las columnas Stripe por si quieres hacer rollback
-- Solo las dejamos sin usar

-- Comentario: Los campos stripe_customer_id y stripe_subscription_id 
-- permanecen en la tabla pero no se usarán con LemonSqueezy


