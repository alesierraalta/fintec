import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tears down a fixture user and every row that cascades from it
 * (accounts → transactions via `transactions_account_id_fkey ON DELETE
 * CASCADE`, and categories via `categories_user_id_fkey ON DELETE
 * CASCADE`), leaving no cross-cycle state.
 *
 * Order matters: `public.users.id` references `auth.users.id` WITHOUT
 * `ON DELETE CASCADE` (see `users_id_fkey` in supabase/schemas/baseline.sql),
 * so the `public.users` profile row must be deleted first (which cascades
 * accounts/categories/transactions); only then can the `auth.users` row be
 * removed via the admin API, fully freeing the fixture email for reuse on
 * the next seed cycle.
 */
export async function teardownEvalDataset(
  client: SupabaseClient,
  userId: string
): Promise<void> {
  const { error: profileError } = await client
    .from('users')
    .delete()
    .eq('id', userId);
  if (profileError) {
    throw new Error(
      `teardownEvalDataset: failed to delete fixture profile ${userId}: ${profileError.message}`
    );
  }

  const { error: authError } = await client.auth.admin.deleteUser(userId);
  if (authError) {
    const alreadyGone = /not.*found/i.test(authError.message ?? '');
    if (!alreadyGone) {
      throw new Error(
        `teardownEvalDataset: failed to delete fixture auth user ${userId}: ${authError.message}`
      );
    }
  }
}
