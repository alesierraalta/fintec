import {
  DEFAULT_FRESHNESS_THRESHOLDS,
  parseFreshnessThresholdConfig,
} from '@/lib/rates/freshness-config';

const hourMs = 60 * 60 * 1000;

describe('parseFreshnessThresholdConfig', () => {
  it('returns safe defaults when env is empty', () => {
    expect(parseFreshnessThresholdConfig({})).toEqual(
      DEFAULT_FRESHNESS_THRESHOLDS
    );
    expect(DEFAULT_FRESHNESS_THRESHOLDS).toEqual({
      freshWindowMs: 24 * hourMs,
      incidentWindowMs: 48 * hourMs,
      hardFailureWindowMs: 7 * 24 * hourMs,
    });
  });

  it('parses generic rates freshness env overrides as hours', () => {
    expect(
      parseFreshnessThresholdConfig({
        RATES_FRESH_WINDOW_HOURS: '12',
        RATES_INCIDENT_WINDOW_HOURS: '36',
        RATES_HARD_FAILURE_WINDOW_HOURS: '120',
      })
    ).toEqual({
      freshWindowMs: 12 * hourMs,
      incidentWindowMs: 36 * hourMs,
      hardFailureWindowMs: 120 * hourMs,
    });
  });

  it('rejects invalid or unsafe threshold configuration', () => {
    expect(() =>
      parseFreshnessThresholdConfig({ RATES_FRESH_WINDOW_HOURS: 'soon' })
    ).toThrow('RATES_FRESH_WINDOW_HOURS must be a finite positive number');
    expect(() =>
      parseFreshnessThresholdConfig({ RATES_INCIDENT_WINDOW_HOURS: '-1' })
    ).toThrow('RATES_INCIDENT_WINDOW_HOURS must be a finite positive number');
    expect(() =>
      parseFreshnessThresholdConfig({
        RATES_FRESH_WINDOW_HOURS: '48',
        RATES_INCIDENT_WINDOW_HOURS: '24',
      })
    ).toThrow('freshWindowMs must be less than incidentWindowMs');
    expect(() =>
      parseFreshnessThresholdConfig({
        RATES_INCIDENT_WINDOW_HOURS: '168',
        RATES_HARD_FAILURE_WINDOW_HOURS: '48',
      })
    ).toThrow('incidentWindowMs must be less than hardFailureWindowMs');
  });
});
