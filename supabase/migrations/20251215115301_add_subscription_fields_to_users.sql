-- Add subscription fields to users table

-- Add tier column with enum check
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free' 
CHECK (tier IN ('free', 'base', 'premium'));

-- Add subscription_status column with enum check
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active' 
CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'paused', 'trialing'));

-- Add subscription_id column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);
