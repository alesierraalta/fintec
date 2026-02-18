import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SubscriptionsRepository,
  UserSubscriptionSnapshot,
} from '@/repositories/contracts';
import { supabase } from './client';

export class SupabaseSubscriptionsRepository
  implements SubscriptionsRepository
{
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async getUserSubscriptionSnapshot(
    userId: string
  ): Promise<UserSubscriptionSnapshot | null> {
    const { data, error } = await this.client
      .from('users')
      .select(
        'id, tier, subscription_tier, subscription_status, subscription_id'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch user subscription: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      tier: data.tier,
      subscriptionTier: data.subscription_tier,
      subscriptionStatus: data.subscription_status,
      subscriptionId: data.subscription_id,
    };
  }
}
