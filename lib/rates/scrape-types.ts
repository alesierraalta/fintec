export enum ScrapeStage {
  SCHEDULER = 'scheduler',
  FETCH = 'fetch',
  PARSE = 'parse',
  VALIDATE = 'validate',
  PERSIST = 'persist',
  CIRCUIT_BREAKER = 'circuit-breaker',
  RATE_LIMIT = 'rate-limit',
  UNKNOWN = 'unknown',
}

export type ScrapeProvider = 'bcv' | 'binance';

export type ScrapeTrigger = 'scheduled' | 'on-demand' | 'manual-recovery';

export type ScrapeAttemptStatus =
  | 'running'
  | 'success'
  | 'failure'
  | 'skipped_locked'
  | 'skipped_circuit_breaker';

export interface ScrapeAttempt {
  attemptId: string;
  provider: ScrapeProvider;
  trigger: ScrapeTrigger;
  stage: ScrapeStage;
  status: ScrapeAttemptStatus;
  failureReason?: string;
  startedAt: string;
  finishedAt?: string;
  extractedCurrencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface ScrapePipelineResult {
  attemptId: string;
  status: ScrapeAttemptStatus;
  success: boolean;
  result?: { usd: number; eur: number; source: string; lastUpdated: string };
  failureStage?: ScrapeStage;
  failureReason?: string;
}
