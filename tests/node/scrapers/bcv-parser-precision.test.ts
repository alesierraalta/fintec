/**
 * BCV Parser Precision Tests
 * Verifies that parsing preserves full precision (8 decimals) and expanded selectors work
 */

import { parseBCVRatesFromHtml } from '@/lib/scrapers/bcv-scraper';

describe('BCV Parser Precision', () => {
  it('should preserve 8 decimal precision from BCV HTML', () => {
    // BCV provides rates with 8 decimals like 544,57940000
    const html = `
      <div id="dolar"><strong>544,57940000</strong></div>
      <div id="euro"><strong>633,21080000</strong></div>
    `;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(544.5794);
    expect(result.eur).toBe(633.2108);
    expect(result.meta.strategyUsed).toBe('known-container');
  });

  it('should preserve precision when using data-attribute selectors', () => {
    // Test expanded selectors with data-currency attribute
    const html = `
      <div data-currency="USD"><strong>544,57940000</strong></div>
      <div data-currency="EUR"><strong>633,21080000</strong></div>
    `;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(544.5794);
    expect(result.eur).toBe(633.2108);
    expect(result.meta.strategyUsed).toBe('known-container');
  });

  it('should preserve precision when using class-based selectors', () => {
    // Test expanded selectors with class names
    const html = `
      <div class="currency-usd"><strong>544,57940000</strong></div>
      <div class="currency-eur"><strong>633,21080000</strong></div>
    `;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(544.5794);
    expect(result.eur).toBe(633.2108);
    expect(result.meta.strategyUsed).toBe('known-container');
  });

  it('should preserve precision when using BCV-specific class selectors', () => {
    // Test BCV-specific class names
    const html = `
      <div class="bcv-dolar"><strong>544,57940000</strong></div>
      <div class="bcv-euro"><strong>633,21080000</strong></div>
    `;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(544.5794);
    expect(result.eur).toBe(633.2108);
    expect(result.meta.strategyUsed).toBe('known-container');
  });
});

describe('BCV Fallback Rates Validation', () => {
  it('should have fallback rates within sane range', () => {
    // Import the fallback rates
    const {
      STATIC_BCV_FALLBACK_RATES,
    } = require('@/lib/services/rates-fallback');

    // USD should be between 400 and 700 (current market range)
    expect(STATIC_BCV_FALLBACK_RATES.usd).toBeGreaterThan(400);
    expect(STATIC_BCV_FALLBACK_RATES.usd).toBeLessThan(700);

    // EUR should be between 400 and 700 (current market range)
    expect(STATIC_BCV_FALLBACK_RATES.eur).toBeGreaterThan(400);
    expect(STATIC_BCV_FALLBACK_RATES.eur).toBeLessThan(700);

    // EUR should generally be higher than USD
    expect(STATIC_BCV_FALLBACK_RATES.eur).toBeGreaterThan(
      STATIC_BCV_FALLBACK_RATES.usd
    );
  });
});
