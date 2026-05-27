import type { ScrapeAttempt } from '@/lib/rates/scrape-types';
import type { ScrapeAttemptsRepository } from '@/repositories/contracts';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SCRAPE_ATTEMPT_INSERT_PROJECTION,
  SCRAPE_ATTEMPT_LIST_PROJECTION,
} from './scrape-attempts-projections';

/**
 * Supabase-backed repository for scrape attempt records.
 *
 * No caching layer — these are operational monitoring queries, not hot-path reads.
 * See design decision in sdd/wire-scrape-pipeline-supabase/design.
 */
export class SupabaseScrapeAttemptsRepository
  implements ScrapeAttemptsRepository
{
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createClient();
  }

  async recordAttempt(attempt: ScrapeAttempt): Promise<void> {
    const { error } = await this.client
      .from('scrape_attempts')
      .insert({
        attempt_id: attempt.attemptId,
        provider: attempt.provider,
        trigger: attempt.trigger,
        stage: attempt.stage,
        status: attempt.status,
        failure_reason: attempt.failureReason ?? null,
        started_at: attempt.startedAt,
        finished_at: attempt.finishedAt ?? null,
        extracted_currencies: attempt.extractedCurrencies ?? null,
        metadata: attempt.metadata ?? null,
      })
      .select(SCRAPE_ATTEMPT_INSERT_PROJECTION)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to record scrape attempt: ${error.message}`);
    }
  }

  async getLatestAttempts(limit: number = 10): Promise<ScrapeAttempt[]> {
    const { data, error } = await this.client
      .from('scrape_attempts')
      .select(SCRAPE_ATTEMPT_LIST_PROJECTION)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(
        `Failed to fetch latest scrape attempts: ${error.message}`
      );
    }

    return (data || []).map((row: any) => ({
      attemptId: row.attempt_id,
      provider: row.provider,
      trigger: row.trigger,
      stage: row.stage,
      status: row.status,
      failureReason: row.failure_reason ?? undefined,
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? undefined,
      extractedCurrencies: row.extracted_currencies ?? undefined,
      metadata: row.metadata ?? undefined,
    }));
  }
}
