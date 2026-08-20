import type { Feedback, CreateFeedbackDTO } from '@/types/feedback';

export interface FeedbacksRepository {
  findByUserAndTarget(userId: string, targetType: string, targetId: string): Promise<Feedback | null>;
  create(userId: string, data: CreateFeedbackDTO): Promise<Feedback>;
}
