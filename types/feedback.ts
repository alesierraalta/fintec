export type Sentiment = 'up' | 'down' | 'neutral';

export interface Feedback {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  sentiment: Sentiment;
  comment: string | null;
  created_at: string;
}

export interface CreateFeedbackDTO {
  target_type: string;
  target_id: string;
  sentiment: Sentiment;
  comment?: string | null;
}
