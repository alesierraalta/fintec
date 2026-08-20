import type { Feedback, CreateFeedbackDTO } from '@/types/feedback';
import type { FeedbacksRepository } from '@/repositories/contracts/feedback-repository';
import { supabase } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { RequestContext } from '@/lib/cache/request-context';

const FEEDBACK_PROJECTION = 'id, user_id, target_type, target_id, sentiment, comment, created_at';

function toDomain(row: Database['public']['Tables']['feedbacks']['Row']): Feedback {
  return {
    id: row.id,
    user_id: row.user_id,
    target_type: row.target_type,
    target_id: row.target_id,
    sentiment: row.sentiment,
    comment: row.comment,
    created_at: row.created_at,
  };
}

export class SupabaseFeedbacksRepository implements FeedbacksRepository {
  private client: SupabaseClient<Database>;
  private readonly requestContext?: RequestContext;

  constructor(client?: SupabaseClient<Database>, requestContext?: RequestContext) {
    this.client = client || (supabase as SupabaseClient<Database>);
    this.requestContext = requestContext;
  }

  private async requireUserId(): Promise<string> {
    if (this.requestContext) return this.requestContext.userId;
    const { data: { user } } = await this.client.auth.getUser();
    if (!user?.id) throw new Error('Unauthorized');
    return user.id;
  }

  private async assertUserScope(userId: string): Promise<string> {
    if (!userId) throw new Error('Unauthorized');
    const authUserId = await this.requireUserId();
    if (userId !== authUserId) throw new Error('Unauthorized');
    return authUserId;
  }

  async findByUserAndTarget(userId: string, targetType: string, targetId: string): Promise<Feedback | null> {
    const scopedUserId = await this.assertUserScope(userId);
    const { data, error } = await this.client
      .from('feedbacks')
      .select(FEEDBACK_PROJECTION)
      .eq('user_id', scopedUserId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error('Failed to fetch feedback');
    }
    return data ? toDomain(data) : null;
  }

  async create(userId: string, data: CreateFeedbackDTO): Promise<Feedback> {
    const scopedUserId = await this.assertUserScope(userId);
    const { data: row, error } = await this.client
      .from('feedbacks')
      .insert([
        {
          user_id: scopedUserId,
          target_type: data.target_type,
          target_id: data.target_id,
          sentiment: data.sentiment,
          comment: data.comment ?? null,
        },
      ])
      .select(FEEDBACK_PROJECTION)
      .single();

    if (error) {
      const err: any = new Error(error.message || 'Failed to create feedback');
      err.code = (error as any).code;
      throw err;
    }
    return toDomain(row);
  }
}
