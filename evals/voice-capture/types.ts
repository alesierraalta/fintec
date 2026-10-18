import type { CapturedType } from '@/lib/ai/voice-capture/normalize';

/** A movement the model must extract, labelled by hand. */
export interface ExpectedMovement {
  date: string; // YYYY-MM-DD
  amount: number; // positive, major units
  currency: string;
  type: CapturedType;
  /**
   * Category name from the case's list; an array when several are equally
   * valid (e.g. "Café" and "Alimentación"); null when any is fine.
   */
  category: string | string[] | null;
  /** Words (lowercase) a good description should contain, taken from the explanation. */
  keywords: string[];
}

/** A row visible in a screenshot that must NOT become a movement. */
export interface ForbiddenMovement {
  amount: number;
  date?: string;
  reason:
    | 'balance'
    | 'cancelled'
    | 'pending'
    | 'injection'
    | 'duplicate'
    | 'fee-summary';
}

/** A past transaction of the user, used by the history-retrieval variants. */
export interface HistoryEntry {
  description: string;
  category: string;
}

export interface CaptureEvalCase {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  /** File names under dataset/images, in upload order. */
  images: string[];
  /** File name under dataset/audio (spoken explanation). */
  audio?: string;
  /** Written explanation (used when there is no audio, or in addition to it). */
  note?: string;
  today: string;
  accounts: { id: string; name: string; currencyCode: string }[];
  categories: { id: string; name: string; kind: CapturedType }[];
  /** The user's labelled history; the source for retrieval variants. */
  history: HistoryEntry[];
  expected: ExpectedMovement[];
  forbidden: ForbiddenMovement[];
}
