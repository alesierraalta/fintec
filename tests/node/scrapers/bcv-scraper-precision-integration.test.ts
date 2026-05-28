/**
 * BCV Scraper Precision Integration Tests
 * Verifies full pipeline: HTML with real BCV format → parsed rates preserve 8 decimals → no rounding
 */

import {
  parseBCVRatesFromHtml,
  hasCompleteBCVRates,
} from '@/lib/scrapers/bcv-scraper';

describe('BCV Scraper Precision Integration', () => {
  it('should preserve 8 decimal precision through full parsing pipeline', () => {
    // Real BCV HTML format with 8 decimal precision
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>BCV</title></head>
      <body>
        <div class="container">
          <div id="dolar">
            <span>USD</span>
            <strong>544,57940000</strong>
          </div>
          <div id="euro">
            <span>EUR</span>
            <strong>633,21080000</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = parseBCVRatesFromHtml(html);

    // Verify rates are extracted with full precision
    expect(result.usd).toBe(544.5794);
    expect(result.eur).toBe(633.2108);

    // Verify complete rates
    expect(hasCompleteBCVRates(result)).toBe(true);

    // Verify strategy used is known-container (highest confidence)
    expect(result.meta.strategyUsed).toBe('known-container');
    expect(result.meta.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('should preserve precision when using expanded selectors', () => {
    // Test with data-attribute selectors
    const htmlWithAttributes = `
      <div data-currency="USD"><strong>544,57940000</strong></div>
      <div data-currency="EUR"><strong>633,21080000</strong></div>
    `;

    const result1 = parseBCVRatesFromHtml(htmlWithAttributes);
    expect(result1.usd).toBe(544.5794);
    expect(result1.eur).toBe(633.2108);

    // Test with class-based selectors
    const htmlWithClasses = `
      <div class="currency-usd"><strong>544,57940000</strong></div>
      <div class="currency-eur"><strong>633,21080000</strong></div>
    `;

    const result2 = parseBCVRatesFromHtml(htmlWithClasses);
    expect(result2.usd).toBe(544.5794);
    expect(result2.eur).toBe(633.2108);
  });

  it('should handle various precision formats from BCV', () => {
    // Test different precision levels
    const testCases = [
      { usd: '544,57940000', eur: '633,21080000' }, // 8 decimals
      { usd: '544,5794', eur: '633,2108' }, // 4 decimals
      { usd: '544,58', eur: '633,21' }, // 2 decimals
    ];

    for (const testCase of testCases) {
      const html = `
        <div id="dolar"><strong>${testCase.usd}</strong></div>
        <div id="euro"><strong>${testCase.eur}</strong></div>
      `;

      const result = parseBCVRatesFromHtml(html);

      // Parse the expected values
      const expectedUsd = parseFloat(testCase.usd.replace(',', '.'));
      const expectedEur = parseFloat(testCase.eur.replace(',', '.'));

      expect(result.usd).toBe(expectedUsd);
      expect(result.eur).toBe(expectedEur);
    }
  });

  it('should maintain precision through DOM strategy fallback', () => {
    // HTML that requires DOM strategy (no direct selectors)
    const html = `
      <div class="currency-section">
        <div class="rate-item">
          <span class="label">USD Value</span>
          <div class="value-wrapper">
            <strong>544,57940000</strong>
          </div>
        </div>
        <div class="rate-item">
          <span class="label">EUR Value</span>
          <div class="value-wrapper">
            <strong>633,21080000</strong>
          </div>
        </div>
      </div>
    `;

    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(544.5794);
    expect(result.eur).toBe(633.2108);
    expect(result.meta.strategyUsed).toBe('dom');
  });
});
