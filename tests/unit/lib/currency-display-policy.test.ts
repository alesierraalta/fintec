import { describe, expect, it } from '@jest/globals';
import {
  deriveFreshness,
  formatDisplayMoney,
  historicalMoney,
  liveMoney,
  unavailableMoney,
} from '../../../lib/currency-display-policy';

describe('DisplayMoneyDTO — currency display policy', () => {
  // Normalize grouping separators / spaces so assertions are ICU-build independent.
  const norm = (s: string) => s.replace(/\./g, '').replace(/\s/g, '');

  describe('historical (stable transaction-time base amounts)', () => {
    it('formats amountBaseMinor without depending on any live rate', () => {
      const result = formatDisplayMoney(historicalMoney(10000, 'USD'));
      expect(result.kind).toBe('historical');
      expect(result.isUnavailable).toBe(false);
      expect(result.text).toBe('$100,00');
      expect(result.provenance).toBeUndefined();
    });

    it('produces the same total for the same data regardless of current rate', () => {
      const first = formatDisplayMoney(historicalMoney(2500, 'VES')).text;
      const second = formatDisplayMoney(historicalMoney(2500, 'VES')).text;
      expect(first).toBe(second);
      expect(norm(first)).toBe('Bs25,00');
    });

    it('enforces integer minor units (no floating-point reconstruction)', () => {
      expect(() =>
        formatDisplayMoney({
          kind: 'historical',
          amountBaseMinor: 100.5,
          currencyCode: 'USD',
        })
      ).toThrow();
    });
  });

  describe('live (provenance + freshness disclosure)', () => {
    it('includes source and freshness in provenance, never implying historical accuracy', () => {
      const dto = liveMoney({
        amountMinor: 365000,
        currencyCode: 'VES',
        rate: 36.5,
        source: 'BCV',
        observedAt: new Date().toISOString(),
        freshness: 'fresh',
      });
      const result = formatDisplayMoney(dto);
      expect(result.kind).toBe('live');
      expect(result.isUnavailable).toBe(false);
      expect(norm(result.text)).toBe('Bs3650,00');
      expect(result.provenance).toContain('BCV');
      expect(result.provenance).toContain('36.5');
      expect(result.provenance).toContain('actualizado');
    });

    it('labels a stale live projection as desactualizado', () => {
      const dto = liveMoney({
        amountMinor: 365000,
        currencyCode: 'VES',
        rate: 36.5,
        source: 'Binance',
        observedAt: '2026-01-01T00:00:00Z',
        freshness: 'stale',
      });
      const result = formatDisplayMoney(dto);
      expect(result.kind).toBe('live');
      expect(result.provenance).toContain('Binance');
      expect(result.provenance).toContain('desactualizado');
    });

    it('uses integer minor units for the projected amount', () => {
      const result = formatDisplayMoney(
        liveMoney({
          amountMinor: 10025,
          currencyCode: 'USD',
          rate: 1,
          source: 'BCV',
          observedAt: new Date().toISOString(),
          freshness: 'fresh',
        })
      );
      // 10025 minor = $100,25 (no fractional reconstruction)
      expect(result.text).toBe('$100,25');
    });
  });

  describe('unavailable (honest state — never 0,00)', () => {
    it('missing-amount shows Sin datos and is not zero', () => {
      const result = formatDisplayMoney(unavailableMoney('missing-amount'));
      expect(result.kind).toBe('unavailable');
      expect(result.isUnavailable).toBe(true);
      expect(result.text).toBe('Sin datos');
      expect(result.text).not.toMatch(/0,00/);
    });

    it('pending shows Pendiente', () => {
      const result = formatDisplayMoney(unavailableMoney('pending'));
      expect(result.text).toBe('Pendiente');
      expect(result.text).not.toMatch(/0,00/);
    });

    it('missing-rate shows Sin tasa', () => {
      const result = formatDisplayMoney(unavailableMoney('missing-rate'));
      expect(result.text).toBe('Sin tasa');
      expect(result.text).not.toMatch(/0,00/);
    });
  });

  describe('deriveFreshness', () => {
    it('is fresh within the age window', () => {
      const now = Date.now();
      expect(
        deriveFreshness(new Date(now - 1000).toISOString(), now)
      ).toBe('fresh');
    });

    it('is stale when old or missing', () => {
      const now = Date.now();
      expect(
        deriveFreshness(
          new Date(now - 1000 * 60 * 60 * 24).toISOString(),
          now
        )
      ).toBe('stale');
      expect(deriveFreshness(undefined, now)).toBe('stale');
    });
  });
});
