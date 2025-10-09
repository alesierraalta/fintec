# Subscription System Architecture

## System Overview

The FinTec subscription system is built on a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React Hooks │  │  UI Components│  │    Pages     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Stripe APIs  │  │   AI APIs    │  │ Subscription │      │
│  │              │  │              │  │    Status    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Feature Gates│  │Usage Tracking│  │     Limits   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Stripe    │  │   OpenAI     │  │  Supabase    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Extended Users Table
```sql
users (
  ...existing fields...,
  subscription_tier VARCHAR(20) DEFAULT 'free',
  subscription_status VARCHAR(20) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_started_at TIMESTAMP,
  subscription_expires_at TIMESTAMP,
  transaction_count_current_month INTEGER DEFAULT 0,
  last_transaction_reset TIMESTAMP DEFAULT NOW()
)
```

### Subscriptions Table
```sql
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Usage Tracking Table
```sql
usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  month_year VARCHAR(7) NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  backup_count INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  export_count INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
)
```

## Component Structure

### Core Components

#### 1. **Subscription Hook** (`hooks/use-subscription.ts`)
Central hook for subscription state management:
- Fetches current subscription status
- Provides tier information
- Checks feature access
- Monitors usage limits

```typescript
const {
  tier,              // 'free' | 'base' | 'premium'
  subscription,      // Full subscription object
  usage,             // Current month usage
  usageStatus,       // Usage with limits
  hasFeature,        // Check feature access
  isAtLimit,         // Check if at limit
  isPremium,         // Quick tier checks
  isBase,
  isFree,
  refresh            // Refresh subscription data
} = useSubscription();
```

#### 2. **Feature Gates** (`lib/subscriptions/feature-gate.ts`)
Server-side access control:
- `checkFeatureAccess()` - Verify feature availability
- `checkUsageLimit()` - Check resource limits
- `useResource()` - Consume resource and increment usage
- `canCreateTransaction()` - Specific resource checks
- `canUseAI()` - AI feature access

#### 3. **Limits System** (`lib/subscriptions/limits.ts`)
Defines and checks usage limits:
- `TIER_LIMITS` - Limit definitions per tier
- `hasFeatureAccess()` - Feature availability
- `isWithinLimit()` - Limit checking
- `getUsagePercentage()` - Usage calculation
- `getUpgradeSuggestion()` - Smart upgrade prompts

### UI Components

#### Subscription Components (`components/subscription/`)

1. **PricingCards** - Tier comparison with features
2. **UsageIndicator** - Visual usage display with progress
3. **UpgradeModal** - Upgrade flow with tier selection
4. **FeatureBadge** - Premium/Base badges
5. **LimitWarning** - Usage limit warnings

### API Routes

#### Stripe APIs (`app/api/stripe/`)
- `checkout/route.ts` - Create checkout session
- `webhook/route.ts` - Handle Stripe webhooks
- `portal/route.ts` - Customer portal access

#### Subscription APIs (`app/api/subscription/`)
- `status/route.ts` - Get subscription status

#### AI APIs (`app/api/ai/`)
- `categorize/route.ts` - Auto-categorize transactions
- `predict/route.ts` - Spending predictions
- `advice/route.ts` - Financial advice
- `analyze/route.ts` - Anomaly detection & budget optimization

## Data Flow

### Subscription Purchase Flow

```
User clicks "Upgrade"
       ↓
POST /api/stripe/checkout
       ↓
Stripe Checkout Session Created
       ↓
User enters payment
       ↓
Stripe processes payment
       ↓
checkout.session.completed webhook
       ↓
Update users & subscriptions tables
       ↓
User redirected to success page
```

### Usage Tracking Flow

```
User creates transaction
       ↓
Check usage limit
       ↓
If at limit → Show upgrade modal
       ↓
If within limit → Proceed
       ↓
Increment usage counter
       ↓
Update usage_tracking table
```

### Monthly Reset Flow

```
Cron job runs (1st of month)
       ↓
Call reset_transaction_count()
       ↓
Reset transaction counters
       ↓
Create new usage_tracking records
```

## Webhook Processing

### Critical Webhooks

1. **checkout.session.completed**
   - Creates subscription record
   - Updates user tier
   - Links Stripe customer

2. **customer.subscription.updated**
   - Syncs subscription status
   - Updates tier if changed
   - Handles cancellations

3. **customer.subscription.deleted**
   - Downgrades to free tier
   - Maintains data (doesn't delete)

4. **invoice.payment_failed**
   - Marks subscription as past_due
   - Triggers notification

5. **invoice.payment_succeeded**
   - Confirms active status
   - Updates period dates

## Security Considerations

### Payment Security
- All payments processed by Stripe (PCI compliant)
- Webhook signatures verified
- Customer portal for self-service

### Feature Access
- Server-side checks for all premium features
- Client-side for UX only (not security)
- Usage limits enforced before action

### Data Protection
- Free tier: 6-month retention with notification
- Paid tiers: Unlimited retention
- Export available before deletion

## Performance Optimizations

### Caching Strategy
- Subscription status cached per request
- Usage stats cached with short TTL
- Tier checks memoized in React

### Database Indexing
- `users.subscription_tier` indexed
- `subscriptions.user_id` indexed
- `usage_tracking.user_id, month_year` composite index

### API Efficiency
- Batch AI requests when possible
- Rate limiting on AI endpoints
- Lazy loading for heavy components

## Monitoring & Alerts

### Key Metrics
- Subscription conversion rate
- Churn rate by tier
- Usage limit violations
- AI feature usage
- Payment failure rate

### Alerts
- Failed webhook processing
- High churn rate
- Payment gateway errors
- AI API errors or rate limits

## Scalability

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Webhook queue for high volume

### Cost Management
- AI requests limited by tier
- OpenAI model optimized (gpt-4o-mini)
- Stripe webhooks idempotent

### Future Scaling
- Consider Redis for usage tracking
- Implement request queuing
- Add CDN for static assets
- Consider microservices for AI

## Migration Path

### From Free to Paid
1. User clicks upgrade
2. Stripe checkout
3. Webhook updates tier
4. Features unlock immediately
5. Historical data preserved

### Downgrade
1. User cancels in portal
2. Subscription continues to period end
3. Webhook processes cancellation
4. At period end: downgrade to free
5. Data retention policy applies

### Account Deletion
1. User requests deletion
2. Create backup option offered
3. After confirmation: soft delete
4. Hard delete after 30 days
5. Stripe subscription cancelled

## Testing Strategy

### Unit Tests
- Feature gate logic
- Usage limit calculations
- Tier determination

### Integration Tests
- Stripe checkout flow
- Webhook processing
- Subscription management

### E2E Tests (Playwright)
- Complete upgrade flow
- Usage limit enforcement
- AI feature access
- Data retention

## Error Handling

### Webhook Failures
- Automatic retry by Stripe
- Manual retry capability
- Sync script for recovery

### Payment Failures
- User notification
- Grace period (Stripe handles)
- Downgrade after repeated failures

### AI Failures
- Graceful degradation
- Fallback to manual categorization
- Error logging and monitoring

