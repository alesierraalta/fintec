import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateWaitlistEntryInput,
  WaitlistRepository,
} from '@/repositories/contracts';
import { RequestContext } from '@/lib/cache/request-context';
import { supabase } from './client';

export class SupabaseWaitlistRepository implements WaitlistRepository {
  private readonly client: SupabaseClient;
  private readonly requestContext?: RequestContext;

  constructor(client?: SupabaseClient, requestContext?: RequestContext) {
    this.client = client || supabase;
    this.requestContext = requestContext;
  }

  async create(input: CreateWaitlistEntryInput): Promise<void> {
    const { error } = await this.client.from('waitlist').insert([
      {
        email: input.email,
        source: input.source,
        referrer: input.referrer || null,
      },
    ]);

    if (error) {
      throw new Error(error.message || 'Failed to create waitlist entry');
    }
  }
}
