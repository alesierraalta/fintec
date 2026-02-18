import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UpdateUserProfileInput,
  UpsertUserProfileInput,
  UsersProfileRepository,
} from '@/repositories/contracts';
import { supabase } from './client';

export class SupabaseUsersProfileRepository implements UsersProfileRepository {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async upsert(input: UpsertUserProfileInput): Promise<void> {
    const { error } = await (this.client.from('users') as any).upsert({
      id: input.id,
      email: input.email,
      name: input.name || null,
      base_currency: input.baseCurrency || 'USD',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as any);

    if (error) {
      throw new Error(`Failed to upsert user profile: ${error.message}`);
    }
  }

  async update(userId: string, input: UpdateUserProfileInput): Promise<void> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) payload.name = input.name;
    if (input.baseCurrency !== undefined)
      payload.base_currency = input.baseCurrency;
    if (input.tier !== undefined) payload.tier = input.tier;
    if (input.subscriptionStatus !== undefined)
      payload.subscription_status = input.subscriptionStatus;
    if (input.subscriptionTier !== undefined)
      payload.subscription_tier = input.subscriptionTier;
    if (input.subscriptionId !== undefined)
      payload.subscription_id = input.subscriptionId;

    const { error } = await (this.client.from('users') as any)
      .update(payload as any)
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }
}
