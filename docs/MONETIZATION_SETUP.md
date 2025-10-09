# FinTec Monetization System - Setup Guide

## Overview

FinTec now includes a comprehensive 3-tier subscription system:
- **Free**: 500 transactions/month, 6-month history, basic features
- **Base ($4.99/month)**: Unlimited transactions, full history, advanced features
- **Premium ($9.99/month)**: Everything in Base + AI-powered features

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `stripe` - Stripe SDK for payment processing
- `@stripe/stripe-js` - Stripe.js client
- `openai` - OpenAI SDK for AI features

### 2. Run Database Migration

Execute the SQL migration to add subscription tables:

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase Dashboard
# File: scripts/migrations/001_add_subscription_schema.sql
```

This creates:
- Subscription fields in `users` table
- `subscriptions` table for tracking subscriptions
- `usage_tracking` table for monitoring usage limits

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:
- Supabase credentials
- Stripe API keys
- Stripe webhook secret
- Stripe price IDs
- OpenAI API key
- App URL

### 4. Set Up Stripe

#### Create Products & Prices

In Stripe Dashboard:

1. **Create Base Product**
   - Name: "FinTec Base"
   - Price: $4.99/month recurring
   - Copy Price ID to `STRIPE_PRICE_ID_BASE`
   - Add metadata: `tier=base`

2. **Create Premium Product**
   - Name: "FinTec Premium"
   - Price: $9.99/month recurring
   - Copy Price ID to `STRIPE_PRICE_ID_PREMIUM`
   - Add metadata: `tier=premium`

#### Configure Webhooks

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Migrate Existing Users

Run the migration script to set existing users to Free tier:

```bash
npm run tsx scripts/migrate-subscriptions.ts
```

This will:
- Set all users to Free tier
- Create subscription records
- Initialize usage tracking
- Send welcome notifications

### 6. Set Up Cron Jobs

For production, set up these cron jobs:

#### Monthly Data Cleanup (1st of month)
```bash
0 0 1 * * npm run tsx scripts/cleanup-old-data.ts
```

Removes data older than 6 months for Free tier users.

#### Usage Reset (1st of month)
```sql
-- In Supabase, create a scheduled function:
SELECT cron.schedule(
  'reset-monthly-usage',
  '0 0 1 * *',
  $$ SELECT reset_transaction_count(); $$
);
```

#### Stripe Sync (daily)
```bash
0 2 * * * npm run tsx scripts/sync-stripe-subscriptions.ts
```

Keeps local database in sync with Stripe subscriptions.

## Feature Implementation

### Feature Gates

Use the feature gating system to control access:

```typescript
import { checkFeatureAccess, canCreateTransaction } from '@/lib/subscriptions/feature-gate';

// Check feature access
const check = await checkFeatureAccess(userId, 'ai_categorization');
if (!check.allowed) {
  // Show upgrade modal
  showUpgradeModal(check.upgradeRequired, check.reason);
  return;
}

// Check usage limits
const canCreate = await canCreateTransaction(userId);
if (!canCreate.allowed) {
  // Show limit reached message
  showLimitWarning(canCreate.reason);
  return;
}
```

### Subscription Hooks

Use React hooks for client-side subscription checks:

```typescript
import { useSubscription } from '@/hooks/use-subscription';

function MyComponent() {
  const { 
    tier, 
    hasFeature, 
    isAtLimit, 
    isPremium 
  } = useSubscription();

  // Check feature access
  if (hasFeature('ai_categorization')) {
    // Show AI features
  }

  // Check usage limits
  if (isAtLimit('transactions')) {
    // Show upgrade prompt
  }

  return (
    <div>
      {isPremium && <PremiumFeatures />}
    </div>
  );
}
```

### AI Features (Premium Only)

AI features are available through API endpoints:

```typescript
// Auto-categorize transaction
const response = await fetch('/api/ai/categorize', {
  method: 'POST',
  body: JSON.stringify({
    userId,
    description: 'Coffee at Starbucks',
    amount: 500,
  }),
});

// Get spending predictions
const predictions = await fetch('/api/ai/predict', {
  method: 'POST',
  body: JSON.stringify({ userId }),
});

// Get financial advice
const advice = await fetch('/api/ai/advice', {
  method: 'POST',
  body: JSON.stringify({ userId }),
});

// Detect anomalies
const anomalies = await fetch('/api/ai/analyze', {
  method: 'POST',
  body: JSON.stringify({ 
    userId, 
    type: 'anomalies' 
  }),
});
```

## Testing

Run the subscription tests:

```bash
# All subscription tests
npm run e2e tests/subscriptions/

# Specific test suite
npx playwright test tests/subscriptions/feature-gates.spec.ts
```

Test coverage includes:
- Feature gates and access control
- Usage limits and tracking
- Stripe integration and payment flow
- AI features
- Data retention policies

## Deployment Checklist

Before deploying to production:

- [ ] Run database migration
- [ ] Configure Stripe products and prices
- [ ] Set up Stripe webhooks
- [ ] Add all environment variables
- [ ] Run migration script for existing users
- [ ] Set up cron jobs for cleanup and resets
- [ ] Test payment flow in Stripe test mode
- [ ] Test webhook handling
- [ ] Verify AI features work with OpenAI API
- [ ] Test upgrade and downgrade flows
- [ ] Verify usage limits enforce correctly
- [ ] Test data retention cleanup

## Monitoring

Key metrics to monitor:

### Subscription Metrics
- New subscriptions per tier
- Conversion rate (Free → Paid)
- Churn rate
- Monthly recurring revenue (MRR)

### Usage Metrics
- Transaction count by tier
- Backup frequency
- AI feature usage
- API call volume

### System Health
- Stripe webhook success rate
- Payment failure rate
- Database cleanup success
- Usage tracking accuracy

## Troubleshooting

### Webhooks Not Working

1. Check webhook endpoint is publicly accessible
2. Verify webhook secret matches `.env`
3. Check Stripe Dashboard → Webhooks → Attempts
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Payment Not Updating Subscription

1. Check Stripe webhook logs
2. Verify metadata includes `userId` and `tier`
3. Run sync script: `npm run tsx scripts/sync-stripe-subscriptions.ts`
4. Check database `subscriptions` table

### AI Features Not Working

1. Verify OpenAI API key is valid
2. Check API usage limits in OpenAI dashboard
3. Verify user has Premium tier
4. Check API error logs

### Usage Limits Not Enforcing

1. Verify `usage_tracking` table has current month record
2. Check usage increment is being called
3. Run: `SELECT * FROM usage_tracking WHERE user_id = 'xxx'`
4. Verify tier limits in `types/subscription.ts`

## Support

For issues or questions:
- Check the FAQ section on `/pricing`
- Review test files for usage examples
- Check Stripe logs for payment issues
- Review Supabase logs for database issues

## Future Enhancements

Potential additions:
- Annual billing with discount
- Team/family plans
- Custom enterprise pricing
- Additional AI features
- White-label options
- API access tiers
- Priority support channels

