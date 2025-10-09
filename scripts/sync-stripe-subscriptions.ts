import { stripe } from '../lib/stripe/config';
import { supabase } from '../repositories/supabase/client';
import { SubscriptionTier } from '../types/subscription';

/**
 * Syncs Stripe subscriptions with local database
 * Useful for fixing any discrepancies between Stripe and our DB
 */
async function syncStripeSubscriptions() {
  console.log('🔄 Starting Stripe subscription sync...');

  try {
    // Get all users with Stripe customer IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id, stripe_subscription_id')
      .not('stripe_customer_id', 'is', null);

    if (usersError) throw usersError;

    console.log(`Found ${users?.length || 0} users with Stripe customers`);

    if (!users || users.length === 0) {
      console.log('No users with Stripe customers found');
      return;
    }

    let synced = 0;
    let errors = 0;

    for (const user of users) {
      try {
        console.log(`Syncing user: ${user.email}`);

        // Get subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id!,
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          console.log(`  No active Stripe subscription found, setting to Free tier`);
          
          // Update to free tier
          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              subscription_status: 'cancelled',
              stripe_subscription_id: null,
            })
            .eq('id', user.id);

          await supabase
            .from('subscriptions')
            .update({
              tier: 'free',
              status: 'cancelled',
            })
            .eq('user_id', user.id);

          synced++;
          continue;
        }

        const stripeSubscription = subscriptions.data[0];
        const tier = stripeSubscription.metadata?.tier as SubscriptionTier || 'free';

        // Determine status
        const status = stripeSubscription.status === 'active' ? 'active'
          : stripeSubscription.status === 'past_due' ? 'past_due'
          : stripeSubscription.status === 'canceled' ? 'cancelled'
          : stripeSubscription.status === 'trialing' ? 'trialing'
          : 'paused';

        console.log(`  Stripe status: ${stripeSubscription.status}, tier: ${tier}`);

        // Update local database
        await supabase
          .from('users')
          .update({
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: stripeSubscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        // Note: Using type assertion for Stripe API compatibility
        const sub = stripeSubscription as any;
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            tier,
            status,
            stripe_subscription_id: stripeSubscription.id,
            stripe_customer_id: user.stripe_customer_id!,
            current_period_start: sub.current_period_start 
              ? new Date(sub.current_period_start * 1000).toISOString()
              : new Date().toISOString(),
            current_period_end: sub.current_period_end 
              ? new Date(sub.current_period_end * 1000).toISOString()
              : new Date().toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end || false,
            updated_at: new Date().toISOString(),
          });

        synced++;
        console.log(`  ✅ Synced successfully`);
      } catch (error) {
        console.error(`  ❌ Error syncing ${user.email}:`, error);
        errors++;
      }
    }

    console.log(`\n✅ Sync completed: ${synced} synced, ${errors} errors`);
  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  syncStripeSubscriptions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { syncStripeSubscriptions };

