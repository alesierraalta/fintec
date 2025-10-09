import { supabase } from '../repositories/supabase/client';

/**
 * Cleans up data older than 6 months for Free tier users
 * Should be run as a cron job monthly
 */
async function cleanupOldData() {
  console.log('🧹 Starting data cleanup for Free tier users...');

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoffDate = sixMonthsAgo.toISOString();

  try {
    // Get all Free tier users
    const { data: freeUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('subscription_tier', 'free');

    if (usersError) throw usersError;

    console.log(`Found ${freeUsers?.length || 0} Free tier users`);

    if (!freeUsers || freeUsers.length === 0) {
      console.log('No Free tier users found');
      return;
    }

    let totalDeleted = 0;

    for (const user of freeUsers) {
      console.log(`Processing user: ${user.email}`);

      // Delete old transactions
      const { data: deleted, error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .lt('date', cutoffDate)
        .in('account_id', [
          // Get user's account IDs subquery
          supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)
        ]);

      if (deleteError) {
        console.error(`Error deleting transactions for ${user.email}:`, deleteError);
        continue;
      }

      const deletedCount = Array.isArray(deleted) ? deleted.length : 0;
      totalDeleted += deletedCount;

      if (deletedCount > 0) {
        console.log(`  Deleted ${deletedCount} old transactions`);

        // Send notification about cleanup
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Limpieza de datos antiguos',
          message: `Se han eliminado ${deletedCount} transacciones de más de 6 meses de antigüedad como parte del plan gratuito. Actualiza a un plan pago para mantener tu historial completo.`,
          type: 'info',
        });
      }
    }

    console.log(`✅ Cleanup completed. Total transactions deleted: ${totalDeleted}`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  cleanupOldData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanupOldData };

