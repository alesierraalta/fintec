import { ScrapeAttempt } from '@/lib/rates/scrape-types';

export interface ScrapeAttemptsRepository {
  recordAttempt(attempt: ScrapeAttempt): Promise<void>;
  getLatestAttempts(limit?: number): Promise<ScrapeAttempt[]>;
}
