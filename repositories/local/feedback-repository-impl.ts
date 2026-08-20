import type { Feedback, CreateFeedbackDTO } from '@/types/feedback';
import type { FeedbacksRepository } from '@/repositories/contracts/feedback-repository';

export class LocalFeedbacksRepository implements FeedbacksRepository {
  private store = new Map<string, Feedback>();

  private key(userId: string, targetType: string, targetId: string): string {
    return `${userId}:${targetType}:${targetId}`;
  }

  async findByUserAndTarget(userId: string, targetType: string, targetId: string): Promise<Feedback | null> {
    return this.store.get(this.key(userId, targetType, targetId)) ?? null;
  }

  async create(userId: string, data: CreateFeedbackDTO): Promise<Feedback> {
    const k = this.key(userId, data.target_type, data.target_id);
    if (this.store.has(k)) {
      const err: any = new Error('duplicate key value violates unique constraint');
      err.code = '23505';
      throw err;
    }
    const row: Feedback = {
      id: crypto.randomUUID(),
      user_id: userId,
      target_type: data.target_type,
      target_id: data.target_id,
      sentiment: data.sentiment,
      comment: data.comment ?? null,
      created_at: new Date().toISOString(),
    };
    this.store.set(k, row);
    return row;
  }
}
