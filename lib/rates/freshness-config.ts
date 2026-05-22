import type { FreshnessThresholds } from './freshness-types';

const HOUR_MS = 60 * 60 * 1000;

export const DEFAULT_FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  freshWindowMs: 24 * HOUR_MS,
  incidentWindowMs: 48 * HOUR_MS,
  hardFailureWindowMs: 7 * 24 * HOUR_MS,
};

export interface FreshnessThresholdEnv {
  RATES_FRESH_WINDOW_HOURS?: string;
  RATES_INCIDENT_WINDOW_HOURS?: string;
  RATES_HARD_FAILURE_WINDOW_HOURS?: string;
}

export function parseFreshnessThresholdConfig(
  env: FreshnessThresholdEnv | Record<string, string | undefined>
): FreshnessThresholds {
  const thresholds = {
    freshWindowMs: parseHours(
      env.RATES_FRESH_WINDOW_HOURS,
      'RATES_FRESH_WINDOW_HOURS',
      24
    ),
    incidentWindowMs: parseHours(
      env.RATES_INCIDENT_WINDOW_HOURS,
      'RATES_INCIDENT_WINDOW_HOURS',
      48
    ),
    hardFailureWindowMs: parseHours(
      env.RATES_HARD_FAILURE_WINDOW_HOURS,
      'RATES_HARD_FAILURE_WINDOW_HOURS',
      7 * 24
    ),
  };
  if (thresholds.freshWindowMs >= thresholds.incidentWindowMs) {
    throw new Error('freshWindowMs must be less than incidentWindowMs');
  }
  if (thresholds.incidentWindowMs >= thresholds.hardFailureWindowMs) {
    throw new Error('incidentWindowMs must be less than hardFailureWindowMs');
  }
  return thresholds;
}

function parseHours(
  value: string | undefined,
  key: string,
  defaultHours: number
): number {
  if (value === undefined || value.trim() === '') return defaultHours * HOUR_MS;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error(`${key} must be a finite positive number`);
  }
  return hours * HOUR_MS;
}
