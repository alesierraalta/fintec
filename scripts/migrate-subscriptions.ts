import { supabase } from '../repositories/supabase/client';

/**
 * Migrates existing users to Free tier subscription
 * Should be run once after deploying subscription system
 */
async function migrateSubscriptions() {
  console.log('🚀 Starting subscription migration...');

  try {
    // Get all users without subscription tier set
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .or('subscription_tier.is.null,subscription_tier.eq.""');

    if (usersError) throw usersError;

    console.log(`Found ${(users as any[])?.length || 0} users to migrate`);

    if (!users || users.length === 0) {
      console.log('No users to migrate');
      return;
    }

    // Update all users to free tier
    const { error: updateError } = await (supabase
      .from('users') as any)
      .update({
        subscription_tier: 'free',
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
        transaction_count_current_month: 0,
        last_transaction_reset: new Date().toISOString(),
      } as any)
      .or('subscription_tier.is.null,subscription_tier.eq.""');

    if (updateError) throw updateError;

    // Create subscription records for all users
    const subscriptionRecords = (users as any[]).map((user: any) => ({
      user_id: user.id,
      tier: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years (essentially forever)
    }));

    const { error: insertError } = await (supabase
      .from('subscriptions') as any)
      .upsert(subscriptionRecords as any);

    if (insertError) throw insertError;

    // Create initial usage tracking records
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageRecords = (users as any[]).map((user: any) => ({
      user_id: user.id,
      month_year: currentMonth,
      transaction_count: 0,
      backup_count: 0,
      api_calls: 0,
      export_count: 0,
      ai_requests: 0,
    }));

    const { error: usageError } = await (supabase
      .from('usage_tracking') as any)
      .upsert(usageRecords as any, { onConflict: 'user_id,month_year' });

    if (usageError) throw usageError;

    console.log(`✅ Successfully migrated ${users.length} users to Free tier`);

    // Send welcome notifications
    for (const user of (users as any[])) {
      await (supabase.from('notifications') as any).insert({
        user_id: (user as any).id,
        title: '¡Nuevo sistema de suscripciones!',
        message: 'Ahora estás en el plan gratuito con acceso a todas las funciones básicas. Explora nuestros planes pagos para desbloquear más funciones.',
        type: 'info',
        action_url: '/pricing',
      } as any);
    }

    console.log('✅ Welcome notifications sent');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateSubscriptions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateSubscriptions };

