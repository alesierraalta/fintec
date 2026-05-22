import { DEFAULT_FRESHNESS_THRESHOLDS } from './freshness-config';
import type {
  FreshnessEvaluation,
  FreshnessThresholds,
} from './freshness-types';

export interface FreshnessPolicyInput {
  timestamp: string | Date | null | undefined;
  now: Date;
  thresholds?: FreshnessThresholds;
}

export class FreshnessPolicy {
  static evaluate({
    timestamp,
    now,
    thresholds = DEFAULT_FRESHNESS_THRESHOLDS,
  }: FreshnessPolicyInput): FreshnessEvaluation {
    if (timestamp === null || timestamp === undefined || timestamp === '')
      return hardFailure('missing-rate');

    const timestampMs =
      timestamp instanceof Date ? timestamp.getTime() : Date.parse(timestamp);
    if (!Number.isFinite(timestampMs)) return hardFailure('invalid-timestamp');

    const ageMs = now.getTime() - timestampMs;
    if (!Number.isFinite(ageMs) || ageMs < 0)
      return hardFailure('invalid-timestamp');

    const ageMinutes = Math.floor(ageMs / (60 * 1000));
    if (ageMs <= thresholds.freshWindowMs)
      return { freshness: 'fresh', ageMinutes, stale: false };
    if (ageMs <= thresholds.incidentWindowMs)
      return { freshness: 'stale-warning', ageMinutes, stale: true };
    if (ageMs <= thresholds.hardFailureWindowMs)
      return { freshness: 'incident', ageMinutes, stale: true };
    return {
      freshness: 'hard-failure',
      ageMinutes,
      stale: true,
      fallbackReason: 'hard-stale',
    };
  }
}

function hardFailure(
  fallbackReason: 'missing-rate' | 'invalid-timestamp'
): FreshnessEvaluation {
  return {
    freshness: 'hard-failure',
    ageMinutes: null,
    stale: true,
    fallbackReason,
  };
}
