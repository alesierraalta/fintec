-- Migration: Add subscription system schema
-- Description: Adds subscription tiers, usage tracking, and Stripe integration

-- 1. Extend users table with subscription fields
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS transaction_count_current_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_transaction_reset TIMESTAMP DEFAULT NOW();

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'base', 'premium')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'paused', 'trialing')),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  transaction_count INTEGER DEFAULT 0,
  backup_count INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  export_count INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- 5. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at 
  BEFORE UPDATE ON usage_tracking 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Create function to reset monthly transaction count
CREATE OR REPLACE FUNCTION reset_transaction_count()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET transaction_count_current_month = 0,
      last_transaction_reset = NOW()
  WHERE DATE_TRUNC('month', last_transaction_reset) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- 8. Insert initial subscription record for existing users (migrate to free tier)
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT 
  id,
  'free',
  'active',
  NOW(),
  NOW() + INTERVAL '100 years' -- Free tier doesn't expire
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE subscriptions.user_id = users.id
);

-- 9. Update existing users to free tier if not already set
UPDATE users 
SET 
  subscription_tier = 'free',
  subscription_status = 'active',
  subscription_started_at = NOW()
WHERE subscription_tier IS NULL OR subscription_tier = '';

