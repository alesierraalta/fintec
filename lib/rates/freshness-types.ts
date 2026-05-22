export type RateFreshness =
  | 'fresh'
  | 'stale-warning'
  | 'incident'
  | 'hard-failure';
export type RateSource =
  | 'database'
  | 'live-scrape'
  | 'fallback'
  | 'unavailable';
export type RateFallbackReason =
  | 'live-scrape-failed'
  | 'database-error'
  | 'cache'
  | 'history'
  | 'static'
  | 'missing-rate'
  | 'invalid-timestamp'
  | 'hard-stale'
  | (string & {});
export type RateUsageContext = 'read-display' | 'conversion';

export interface RateResponseMetadata {
  source: RateSource;
  timestamp: string | null;
  ageMinutes: number | null;
  freshness: RateFreshness;
  fallback: boolean;
  stale: boolean;
  fromLiveScrape: boolean;
  fallbackReason?: RateFallbackReason;
}

export interface FreshnessThresholds {
  freshWindowMs: number;
  incidentWindowMs: number;
  hardFailureWindowMs: number;
}

export interface FreshnessEvaluation {
  freshness: RateFreshness;
  ageMinutes: number | null;
  stale: boolean;
  fallbackReason?: RateFallbackReason;
}
