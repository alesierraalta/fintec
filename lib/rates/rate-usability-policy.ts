import type {
  RateFallbackReason,
  RateFreshness,
  RateSource,
} from './freshness-types';

export interface RateUsabilityInput {
  freshness: RateFreshness;
  source: RateSource;
  fallback: boolean;
}

export interface RateUsabilityEvaluation {
  usableForReadDisplay: boolean;
  usableForConversion: boolean;
  authoritativeForConversion: boolean;
  requiresWarning: boolean;
  reason?: RateFallbackReason;
}

export class RateUsabilityPolicy {
  static evaluate(input: RateUsabilityInput): RateUsabilityEvaluation {
    if (input.source === 'unavailable') return blocked(false, 'missing-rate');
    if (input.fallback || input.source === 'fallback')
      return blocked(true, 'static');
    if (input.freshness === 'hard-failure') return blocked(true, 'hard-stale');

    return {
      usableForReadDisplay: true,
      usableForConversion: true,
      authoritativeForConversion: true,
      requiresWarning: input.freshness !== 'fresh',
    };
  }
}

function blocked(
  usableForReadDisplay: boolean,
  reason: RateFallbackReason
): RateUsabilityEvaluation {
  return {
    usableForReadDisplay,
    usableForConversion: false,
    authoritativeForConversion: false,
    requiresWarning: true,
    reason,
  };
}
